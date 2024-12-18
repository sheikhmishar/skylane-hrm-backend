import type { RequestHandler } from 'express'

import { EmployeeIdParams } from '../Entities/_IdParams'
import { ResponseError } from '../configs'
import AppDataSource from '../configs/db'
import transformAndValidate from '../utils/transformAndValidate'
import { statusCodes } from './_middlewares/response-code'
import SITEMAP from './_routes/SITEMAP'
import EmployeeSalary from '../Entities/EmployeeSalary'

const { NOT_FOUND } = statusCodes
const { _params } = SITEMAP.salaries

export const employeeSalaryDetails: RequestHandler<
  Partial<typeof _params>,
  EmployeeSalary[],
  {}
> = async (req, res, next) => {
  try {
    const { employeeId } = await transformAndValidate(
      EmployeeIdParams,
      req.params
    )

    const employeeSalaries = await AppDataSource.getRepository(
      EmployeeSalary
    ).find({ where: { employee: { id: employeeId } } })
    if (!employeeSalaries.length)
      throw new ResponseError('No Salary Found', NOT_FOUND)

    res.json(employeeSalaries)
  } catch (err) {
    next(err)
  }
}
