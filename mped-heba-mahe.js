const knex = require('knex');
const ExcelJS = require('exceljs');
const moment = require('moment');
require('dotenv').config();

// Database connection
const db = knex({
    client: 'mssql',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    },
});

// Define date range
const startDate = '2024-12-01';
const endDate = '2025-01-15';

// Fetch tasks based on criteria
async function fetchFilteredTasks() {
    try {
        const tasks = await db
        .from(
            db('dbo.Tasks as T')
                .select('T.*')
                .where('T.TypeID', 1)
                .as('FilteredTasks') // Use a subquery to filter TypeID first
        )
        .select(
            'FilteredTasks.ID as TaskID',
            'FilteredTasks.SanitizedTitle',
            'FilteredTasks.CreatedDTS',
            db.raw(`'https://tarasol.mped.gov.eg/tasks/' + CAST(FilteredTasks.ID AS NVARCHAR) AS TaskLink`),
            'CU.FirstName as CreatorFirstName',
            'AU.FirstName as AssigneeFirstName'
        )
        .leftJoin('dbo.Users as CU', 'FilteredTasks.CreatorUserID', 'CU.ID')
        .leftJoin('dbo.TaskAssignment as TA', 'FilteredTasks.ID', 'TA.TaskID')
        .leftJoin('dbo.Users as AU', 'TA.AssigneeUserID', 'AU.ID')
        .where('FilteredTasks.CreatorUserID', 151)
        .where('TA.AssigneeUserID', 396)
        .whereBetween('FilteredTasks.CreatedDTS', [startDate, endDate]);
    
        return tasks;
    } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        throw error;
    }
}

// Export tasks to Excel
async function exportTasksToExcel(tasks) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Filtered Tasks');

    // Define headers
    worksheet.addRow([
        'Task ID',
        'Hyperlink',
        'Creator Name',
        'Assignee Name',
        'Title',
        'Created At'
    ]);

    // Format headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }, // Light Gray background
    };

    // Add data
    tasks.forEach(task => {
        worksheet.addRow([
            task.TaskID,
            task.TaskLink,
            task.CreatorFirstName || '-',
            task.AssigneeFirstName || '-',
            task.SanitizedTitle,
            moment(task.CreatedDTS).format('YYYY-MM-DD HH:mm:ss')
        ]);
    });

    worksheet.columns.forEach(column => {
        column.width = 30;
    });

    // Save file
    const fileName = `filtered_tasks_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    await workbook.xlsx.writeFile(fileName);
    console.log(`✅ Excel file saved as ${fileName}`);
}

// Main function
async function main() {
    try {
        const tasks = await fetchFilteredTasks();
        if (tasks.length === 0) {
            console.log('No tasks found matching the criteria.');
            return;
        }
        await exportTasksToExcel(tasks);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        db.destroy(); // Close DB connection
    }
}

main();
