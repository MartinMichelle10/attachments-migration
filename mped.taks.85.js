const knex = require('knex');
const ExcelJS = require('exceljs');
const moment = require('moment');
require('dotenv').config();

const db = knex({
    client: 'mssql',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    },
});

async function fetchUsersByEntity(entityId) {
    try {
        const users = await db('dbo.Users')
            .select('ID')
            .where('EntityID', entityId);

        return users.map(user => user.ID);
    } catch (error) {
        console.error('Error fetching users:', error);
        process.exit(1);
    }
}

async function fetchTasksByUsers(userIds) {
    try {
        const tasks = await db('dbo.Tasks as T')
            .select(
                'T.ID as TaskID',
                'T.CreatorUserID',
                'U.FirstName as CreatorUserName', // Fetch Creator User Name
                'T.SanitizedTitle',
                'T.CreatedDTS',
                db.raw(`'https://tarasol.mped.gov.eg/tasks/' + CAST(T.ID AS NVARCHAR) AS TaskLink`),
                db.raw(` 
                STUFF((
                    SELECT DISTINCT ', ' + U2.FirstName 
                    FROM dbo.TaskAssignment TA
                    LEFT JOIN dbo.Users U2 ON TA.AssigneeUserID = U2.ID
                    WHERE TA.TaskID = T.ID AND U2.FirstName IS NOT NULL
                    FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') 
                AS UserAssignees
            `),
                db.raw(` 
                STUFF((
                  SELECT DISTINCT ', ' + E.Name 
                  FROM dbo.TaskAssignment TA3
                  LEFT JOIN dbo.LKEntityStucture E ON TA3.AssigneeEntityID = E.ID
                  WHERE TA3.TaskID = T.ID AND E.Name IS NOT NULL
                  FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') 
                AS EntityNames
              `)
            )
            .leftJoin('dbo.Users as U', 'T.CreatorUserID', 'U.ID') // Join to get creator's name
            .whereIn('T.CreatorUserID', userIds)
            .andWhere('T.StatusID', 2) // Only closed tasks
            .whereBetween('T.CreatedDTS', ['2024-12-03', moment().subtract(1, 'days').format('YYYY-MM-DD')]) // Date range
            .groupBy('T.ID', 'T.CreatorUserID', 'U.FirstName', 'T.SanitizedTitle', 'T.CreatedDTS');

        // Filter tasks to include only those with 3+ assignees
        const filteredTasks = tasks.filter(task => {
            const userCount = task.UserAssignees ? task.UserAssignees.split(', ').length : 0;
            const entityCount = task.EntityNames ? task.EntityNames.split(', ').length : 0;
            return userCount + entityCount >= 3;
        });

        // Group by month
        const groupedByMonth = {};
        filteredTasks.forEach(task => {
            const month = moment(task.CreatedDTS).format('YYYY-MM');
            if (!groupedByMonth[month]) {
                groupedByMonth[month] = [];
            }
            groupedByMonth[month].push(task);
        });

        return groupedByMonth;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        process.exit(1);
    }
}


async function exportTasksToExcel(groupedTasks) {
    const workbook = new ExcelJS.Workbook();

    Object.keys(groupedTasks).forEach(month => {
        const worksheet = workbook.addWorksheet(month);

        // Define the header row
        worksheet.addRow([
            'Task ID',
            'Hyperlink',
            'Creator User ID',
            'Creator User Name',
            'Sanitized Title',
            'Created At',
            'User Assignees',
            'Entity Assignees'
        ]);

        // Format the headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' } // Light Gray background
        };

        groupedTasks[month].forEach(task => {
            worksheet.addRow([
                task.TaskID,
                task.TaskLink,
                task.CreatorUserID,
                task.CreatorUserName,
                task.SanitizedTitle,
                moment(task.CreatedDTS).format('YYYY-MM-DD HH:mm:ss'),
                task.UserAssignees || '-',
                task.EntityAssignees || '-'
            ]);
        });

        worksheet.columns.forEach(column => {
            column.width = 30; // Adjust width for readability
        });
    });

    await workbook.xlsx.writeFile('closed_tasks_by_month.xlsx');
    console.log('✅ Excel file saved as closed_tasks_by_month.xlsx');
}

async function main() {
    const entityId = 85;
    const userIds = await fetchUsersByEntity(entityId);
    if (userIds.length === 0) {
        console.log('No users found for the entity.');
        process.exit(0);
    }
    
    const groupedTasks = await fetchTasksByUsers(userIds);
    if (Object.keys(groupedTasks).length === 0) {
        console.log('No closed tasks found with 3+ assignees in the date range.');
        process.exit(0);
    }

    await exportTasksToExcel(groupedTasks);
    db.destroy(); // Close DB connection
}

main();
