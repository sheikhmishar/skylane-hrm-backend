import bcrypt from 'bcrypt'
import type { RequestHandler } from 'express'

import path from 'path'
import fsPromise from 'fs/promises'
import fs from 'fs'

import Employee from '../Entities/Employee'
import EmployeeSalary from '../Entities/EmployeeSalary'
import User from '../Entities/User'
import IdParams from '../Entities/_IdParams'
import {
  ResponseError,
  employeeDocumentsPath,
  employeePhotosPath
} from '../configs'
import AppDataSource from '../configs/db'
import { decodeMultipartBody } from '../utils/multipart'
import transformAndValidate from '../utils/transformAndValidate'
import { statusCodes } from './_middlewares/response-code'
import SITEMAP from './_routes/SITEMAP'

const { CREATED, NOT_FOUND } = statusCodes
const { _params } = SITEMAP.employees

export const allEmployees: RequestHandler<{}, Employee[]> = async (
  _,
  res,
  next
) => {
  try {
    res.json(
      await AppDataSource.getRepository(Employee).find({
        order: { id: { direction: 'DESC' } }
      })
    )
  } catch (err) {
    next(err)
  }
}

export const allEmployeeAssets: RequestHandler<{}, Employee[]> = async (
  _,
  res,
  next
) => {
  try {
    res.json(
      (await AppDataSource.getRepository(Employee).find()).filter(
        employee => employee.assets.length
      )
    )
  } catch (err) {
    next(err)
  }
}

export const employeeDetails: RequestHandler<
  Partial<typeof _params>,
  Employee
> = async (req, res, next) => {
  try {
    const { id } = await transformAndValidate(IdParams, req.params)

    const employee = await AppDataSource.getRepository(Employee).findOne({
      where: { id },
      relations: { branch: true }
    })
    if (!employee)
      throw new ResponseError(`No Employee with ID: ${id}`, NOT_FOUND)
    res.json(employee)
  } catch (err) {
    next(err)
  }
}

export const addEmployee: RequestHandler<
  {},
  { message: string; data: User },
  RecursivePartial<Employee> // TODO: all
> = async (req, res, next) => {
  const queryRunner = AppDataSource.createQueryRunner()
  const photoFile = (req.files as ParsedMulter<(typeof req)['body']>)
    ?.photo?.[0]
  const documentFiles = (req.files as ParsedMulter<(typeof req)['body']>)
    ?.documents

  try {
    await queryRunner.connect()
    await queryRunner.startTransaction()

    const reqBody = decodeMultipartBody(req)
    if (photoFile)
      reqBody.photo =
        photoFile.filename + '_' + path.extname(photoFile.originalname)
    else delete reqBody.photo

    reqBody.documents = documentFiles
      ? reqBody.documents?.map((document, i) => ({
          ...document,
          path: documentFiles[i]
            ? documentFiles[i]!.filename +
              '_' +
              path.extname(documentFiles[i]!.originalname)
            : document?.path || '' // TODO: throw error
        }))
      : []

    const employee = await transformAndValidate(Employee, reqBody)

    if ((reqBody as any).forceId === 'true')
      employee.id = parseInt(reqBody.id?.toString())

    if (photoFile && employee.photo) {
      const destinationPath = path.join(employeePhotosPath, employee.photo)
      await fsPromise.rename(photoFile.path, destinationPath)
      photoFile.path = destinationPath
      photoFile.filename = employee.photo
    }

    if (documentFiles)
      for (let i = 0; i < employee.documents.length; i++) {
        const destinationPath = path.join(
          employeeDocumentsPath,
          employee.documents[i]!.path
        )
        await fsPromise.rename(documentFiles[i]!.path, destinationPath)
        documentFiles[i]!.path = destinationPath
        documentFiles[i]!.filename = employee.documents[i]!.path
      }

    const user = await transformAndValidate(User, {
      id: -1,
      email: employee.email,
      name: employee.name,
      password: await bcrypt.hash('DEFAULT_PASSWORD', 10),
      phoneNumber: employee.phoneNumber,
      status: employee.status,
      type: 'Employee',
      employee
    } satisfies User)
    if (reqBody.branch?.id) employee.branch.id = reqBody.branch.id
    if (reqBody.company?.id) employee.company.id = reqBody.company.id
    if (reqBody.department?.id) employee.department.id = reqBody.department.id
    if (reqBody.designation?.id)
      employee.designation.id = reqBody.designation.id
    if (reqBody.dutyType?.id) employee.dutyType.id = reqBody.dutyType.id
    if (reqBody.salaryType?.id) employee.salaryType.id = reqBody.salaryType.id

    await queryRunner.manager.save(Employee, employee)
    user.employee = employee
    await queryRunner.manager.insert(User, user)

    await queryRunner.commitTransaction()

    res
      .status(CREATED)
      .json({ message: 'Successfully Created Employee', data: user })
  } catch (err) {
    try {
      if (photoFile?.path && fs.existsSync(photoFile.path))
        await fsPromise.unlink(photoFile.path)
    } catch (error) {
      ;(err as Error).message += ', ' + (error as Error).message
    }
    documentFiles?.forEach(async documentFile => {
      try {
        if (fs.existsSync(documentFile.path))
          await fsPromise.unlink(documentFile.path)
      } catch (error) {
        ;(err as Error).message += ', ' + (error as Error).message
      }
    })
    await queryRunner.rollbackTransaction()
    next(err)
  } finally {
    await queryRunner.release()
  }
}

export const updateEmployee: RequestHandler<
  Partial<typeof _params>,
  { message: string; data: Employee },
  RecursivePartial<Employee & Pick<EmployeeSalary, 'remarks'>>
> = async (req, res, next) => {
  const queryRunner = AppDataSource.createQueryRunner()
  const photoFile = (req.files as ParsedMulter<(typeof req)['body']>)
    ?.photo?.[0]
  const documentFiles = (req.files as ParsedMulter<(typeof req)['body']>)
    ?.documents

  let prevPhotoPath = '',
    backupPhotoPath = ''

  let prevDocumentsPaths: string[] = [],
    backupDocumentsPaths: string[] = [],
    newDocumentsPaths: string[] = []

  try {
    await queryRunner.connect()
    await queryRunner.startTransaction()

    const { id } = await transformAndValidate(IdParams, req.params)
    const previousEmployee = await queryRunner.manager
      .getRepository(Employee)
      .findOne({ where: { id } })
    if (!previousEmployee)
      throw new ResponseError(`No Employee with ID: ${id}`, NOT_FOUND)

    const reqBody = decodeMultipartBody(req)

    if (photoFile)
      reqBody.photo = photoFile.filename + path.extname(photoFile.originalname)
    else delete reqBody.photo

    if (documentFiles) {
      let i = 0
      reqBody.documents = reqBody.documents?.map(document => {
        const documentFile = documentFiles[i]
        const hasBlob = document?.path?.startsWith('blob:') // TODO: check
        if (hasBlob) i++
        return {
          ...document,
          path:
            hasBlob && documentFile
              ? documentFile.filename +
                '_' +
                path.extname(documentFile.originalname)
              : document?.path
        }
      })
    }

    const employee = await transformAndValidate(Employee, {
      ...previousEmployee,
      ...reqBody
    })

    if (
      photoFile?.path &&
      employee.photo &&
      employee.photo !== previousEmployee.photo
    ) {
      const destinationPath: string = path.join(
        employeePhotosPath,
        employee.photo
      )
      if (previousEmployee.photo) {
        prevPhotoPath = path.join(employeePhotosPath, previousEmployee.photo)
        backupPhotoPath = prevPhotoPath + '.bak'
      }
      if (fs.existsSync(prevPhotoPath))
        await fsPromise.rename(prevPhotoPath, backupPhotoPath)
      await fsPromise.rename(photoFile.path, destinationPath)
      photoFile.path = destinationPath
    }

    if (documentFiles) {
      let docIdx = 0
      for (let i = 0; i < employee.documents.length; i++) {
        const destinationPath: string = path.join(
          employeeDocumentsPath,
          employee.documents[i]!.path
        )
        if (
          !fs.existsSync(destinationPath) &&
          documentFiles[docIdx] &&
          fs.existsSync(documentFiles[docIdx]!.path)
        ) {
          await fsPromise.rename(documentFiles[docIdx]!.path, destinationPath)
          documentFiles[docIdx]!.path = destinationPath

          newDocumentsPaths.push(destinationPath)
          docIdx++
        }
      }
    }

    previousEmployee.documents.forEach(async document => {
      if (!employee.documents.find(({ path }) => path === document.path)) {
        const prevDocumentPath = path.join(employeeDocumentsPath, document.path)
        const backupDocumentPath = prevDocumentPath + '.bak'
        prevDocumentsPaths.push(prevDocumentPath)
        backupDocumentsPaths.push(backupDocumentPath)
        if (fs.existsSync(prevDocumentPath))
          await fsPromise.rename(prevDocumentPath, backupDocumentPath)
      }
    })

    employee.id = id
    employee.branch.id = reqBody.branch?.id || previousEmployee.branch.id
    employee.company.id = reqBody.company?.id || previousEmployee.company.id
    employee.department.id =
      reqBody.department?.id || previousEmployee.department.id
    employee.designation.id =
      reqBody.designation?.id || previousEmployee.designation.id
    employee.dutyType.id = reqBody.dutyType?.id || previousEmployee.dutyType.id
    employee.salaryType.id =
      reqBody.salaryType?.id || previousEmployee.salaryType.id

    const previousUser = await queryRunner.manager.getRepository(User).findOne({
      where: { employee: { id } }
    })
    const user = await transformAndValidate(User, {
      email: employee.email,
      name: employee.name,
      phoneNumber: employee.phoneNumber,
      password:
        previousUser?.password || (await bcrypt.hash('DEFAULT_PASSWORD', 10)),
      type: 'Employee',
      status: employee.status,
      employee
    } as User)
    user.employee = employee
    if (previousUser) user.id = previousUser.id

    await queryRunner.manager.save(Employee, employee)
    await queryRunner.manager.save(User, user)

    if (
      !(
        [
          'basicSalary',
          'conveyance',
          'foodCost',
          'houseRent',
          'medicalCost',
          'taskWisePayment',
          'totalSalary'
        ] satisfies (keyof EmployeeSalary)[]
      ).every(k => previousEmployee[k] === employee[k]) ||
      previousEmployee.designation.id !== employee.designation.id
    ) {
      const salary = await transformAndValidate(EmployeeSalary, {
        id: -1,
        changedAt: new Date(),
        basicSalary: employee.basicSalary,
        conveyance: employee.conveyance,
        foodCost: employee.foodCost,
        houseRent: employee.houseRent,
        medicalCost: employee.medicalCost,
        totalSalary: employee.totalSalary,
        taskWisePayment: employee.taskWisePayment,
        wordLimit: employee.wordLimit,
        designation: employee.designation,
        remarks: reqBody.remarks,
        employee
      } satisfies EmployeeSalary)
      salary.employee = employee
      await queryRunner.manager.insert(EmployeeSalary, salary)
    }

    if (fs.existsSync(backupPhotoPath)) await fsPromise.unlink(backupPhotoPath)
    backupDocumentsPaths.forEach(async backupDocumentPath => {
      if (fs.existsSync(backupDocumentPath))
        await fsPromise.unlink(backupDocumentPath)
    })

    await queryRunner.commitTransaction()
    res.json({ message: 'Employee updated', data: employee })
  } catch (err) {
    try {
      if (photoFile?.path && fs.existsSync(photoFile.path))
        await fsPromise.unlink(photoFile.path)
      if (fs.existsSync(backupPhotoPath))
        await fsPromise.rename(backupPhotoPath, prevPhotoPath)
    } catch (error) {
      ;(err as Error).message += ', ' + (error as Error).message
    }
    newDocumentsPaths.forEach(async newDocumentPath => {
      try {
        if (fs.existsSync(newDocumentPath))
          await fsPromise.unlink(newDocumentPath)
      } catch (error) {
        ;(err as Error).message += ', ' + (error as Error).message
      }
    })
    backupDocumentsPaths.forEach(async (backupDocumentPath, i) => {
      try {
        if (fs.existsSync(backupDocumentPath) && prevDocumentsPaths[i])
          await fsPromise.rename(backupDocumentPath, prevDocumentsPaths[i]!)
      } catch (error) {
        ;(err as Error).message += ', ' + (error as Error).message
      }
    })
    await queryRunner.rollbackTransaction()
    next(err)
  } finally {
    await queryRunner.release()
  }
}
