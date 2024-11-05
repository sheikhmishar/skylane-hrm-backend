const { employeeDocumentDirName } = require('../../configs')
const { default: env } = require('../../configs/env')

const root = '/api',
  staticRoot = '/static',
  usersRoot = `${root}/users`,
  employeesRoot = `${root}/employees`,
  attendancesRoot = `${root}/attendances`,
  leavesRoot = `${root}/leaves`,
  salariesRoot = `${root}/salaries`,
  holidaysRoot = `${root}/holidays`,
  companiesRoot = `${root}/companies`,
  departmentsRoot = `${root}/departments`,
  monthlySalariesRoot = `${root}/monthly-salaries`,
  settingsRoot = `${root}/settings`,
  branchesRoot = `${root}/branches`,
  dutyTypesRoot = `${root}/duty-types`,
  salaryTypesRoot = `${root}/salary-types`,
  designationsRoot = `${root}/designations`

const rootParams = { id: ':id' }

const SITEMAP = {
  seed: !env.production ? `${root}/seed` : undefined,
  static: {
    _: staticRoot,
    employeeDocuments: `${staticRoot}/${employeeDocumentDirName}`
  },
  users: {
    _params: rootParams,
    _: usersRoot,
    postRegister: `${usersRoot}/register`,
    postLogin: `${usersRoot}/login`,
    get: usersRoot,
    getSelf: `${usersRoot}/self`,
    getById: `${usersRoot}/:id`,
    put: `${usersRoot}/:id`
  },
  employees: {
    _params: rootParams,
    _: employeesRoot,
    post: employeesRoot,
    postBulk: `${employeesRoot}/bulk`, // TODO:
    get: employeesRoot,
    getAssets: `${employeesRoot}/assets`,
    getById: `${employeesRoot}/:id`,
    put: `${employeesRoot}/:id`
  },
  attendances: {
    _params: { ...rootParams, employeeId: ':employeeId' },
    _queries: { from: 'from', to: 'to', date: 'date' },
    _: attendancesRoot,
    post: attendancesRoot,
    get: attendancesRoot,
    getCompanyWise: `${attendancesRoot}/companywise`,
    getByEmployeeId: `${attendancesRoot}/:employeeId`,
    put: `${attendancesRoot}/:id`,
    delete: `${attendancesRoot}/:id`
  },
  leaves: {
    _params: { ...rootParams, employeeId: ':employeeId' },
    _queries: { from: 'from', to: 'to' },
    _: leavesRoot,
    post: leavesRoot,
    get: leavesRoot,
    getByEmployeeId: `${leavesRoot}/:employeeId`,
    delete: `${leavesRoot}/:id`
  },
  salaries: {
    _params: { ...rootParams, employeeId: ':employeeId' },
    _: salariesRoot,
    getByEmployeeId: `${salariesRoot}/:employeeId`
  },
  monthlySalaries: {
    _params: { ...rootParams, start_date: ':start_date' },
    _queries: { monthStartDate: 'monthStartDate' },
    _: monthlySalariesRoot,
    post: monthlySalariesRoot,
    get: monthlySalariesRoot,
    getAllByEmployeeId: `${monthlySalariesRoot}/employee/:id`,
    getById: `${monthlySalariesRoot}/:id`,
    put: `${monthlySalariesRoot}/:id`,
    putConfirm: `${monthlySalariesRoot}/confirm/:start_date`,
    delete: `${monthlySalariesRoot}/:start_date`
  },
  holidays: {
    _params: { monthStart: ':monthStart', date: ':date' },
    _: holidaysRoot,
    getByMonthStart: `${holidaysRoot}/:monthStart`,
    post: holidaysRoot,
    delete: `${holidaysRoot}/:date`
  },
  companies: {
    _params: rootParams,
    _: companiesRoot,
    post: companiesRoot,
    get: companiesRoot,
    getById: `${companiesRoot}/:id`,
    put: `${companiesRoot}/:id`
  },
  departments: {
    _params: rootParams,
    _: departmentsRoot,
    post: departmentsRoot,
    get: departmentsRoot,
    getById: `${departmentsRoot}/:id`,
    put: `${departmentsRoot}/:id`
  },
  branches: {
    _params: rootParams,
    _: branchesRoot,
    post: branchesRoot,
    get: branchesRoot,
    getById: `${branchesRoot}/:id`,
    put: `${branchesRoot}/:id`
  },
  dutyTypes: {
    _params: rootParams,
    _: dutyTypesRoot,
    post: dutyTypesRoot,
    get: dutyTypesRoot,
    getById: `${dutyTypesRoot}/:id`,
    put: `${dutyTypesRoot}/:id`
  },
  salaryTypes: {
    _params: rootParams,
    _: salaryTypesRoot,
    post: salaryTypesRoot,
    get: salaryTypesRoot,
    getById: `${salaryTypesRoot}/:id`,
    put: `${salaryTypesRoot}/:id`
  },
  designations: {
    _params: rootParams,
    _: designationsRoot,
    post: designationsRoot,
    get: designationsRoot,
    getById: `${designationsRoot}/:id`,
    put: `${designationsRoot}/:id`
  },
  settings: {
    _params: { property: ':property' },
    _: settingsRoot,
    get: settingsRoot,
    getByProperty: `${settingsRoot}/:property`,
    put: `${settingsRoot}/:property`
  }
}

module.exports = SITEMAP
