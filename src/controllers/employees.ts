import type { RequestHandler } from 'express'

import Employee from '../Entities/Employee'
import IdParams from '../Entities/_IdParams'
import { ResponseError } from '../configs'
import AppDataSource from '../configs/db'
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
        relations: {
          company: true,
          branch: true,
          department: true,
          designation: true,
          dutyType: true,
          salaryType: true
        }
      })
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
      relations: {
        company: true,
        branch: true,
        department: true,
        designation: true,
        dutyType: true,
        salaryType: true
      }
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
  { message: string; data: Employee },
  Partial<Employee>
> = async (req, res, next) => {
  try {
    const employee = await transformAndValidate(Employee, req.body)
    if (req.body.branch?.id) employee.branch.id = req.body.branch.id
    if (req.body.company?.id) employee.company.id = req.body.company.id
    if (req.body.department?.id) employee.department.id = req.body.department.id
    if (req.body.designation?.id)
      employee.designation.id = req.body.designation.id
    if (req.body.dutyType?.id) employee.dutyType.id = req.body.dutyType.id
    if (req.body.salaryType?.id) employee.salaryType.id = req.body.salaryType.id

    await AppDataSource.manager.save(Employee, employee)

    res
      .status(CREATED)
      .json({ message: 'Successfully Created Employee', data: employee })
  } catch (err) {
    next(err)
  }
}

export const updateEmployee: RequestHandler<
  Partial<typeof _params>,
  { message: string; data: Employee },
  Partial<Employee>
> = async (req, res, next) => {
  try {
    const { id } = await transformAndValidate(IdParams, req.params)
    const previousEmployee = await AppDataSource.getRepository(
      Employee
    ).findOneBy({
      id
    })
    const employee = await transformAndValidate(Employee, {
      ...previousEmployee,
      ...req.body
    })
    if (req.body.branch?.id) employee.branch.id = req.body.branch.id
    if (req.body.company?.id) employee.company.id = req.body.company.id
    if (req.body.department?.id) employee.department.id = req.body.department.id
    if (req.body.designation?.id)
      employee.designation.id = req.body.designation.id
    if (req.body.dutyType?.id) employee.dutyType.id = req.body.dutyType.id
    if (req.body.salaryType?.id) employee.salaryType.id = req.body.salaryType.id

    const result = await AppDataSource.manager.update(
      Employee,
      { id },
      employee
    )
    if (!result.affected)
      throw new ResponseError(`No Employee with ID: ${id}`, NOT_FOUND)

    employee.id = id
    res.json({ message: 'Employee updated', data: employee })
  } catch (err) {
    next(err)
  }
}