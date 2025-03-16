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

async function fetchCorrespondences() {
    try {

        const correspondences = await db('dbo.Correspondences as C')
        .select(
            'C.ID as CorrespondenceID',
            'C.ReferenceNumber',
            'C.Subject',
            'C.CreatedDTS',
            'C.PriorityID',
            'C.IsConfidential',
            'S.Name as StatusName',
            'T.Name as CorrespondenceTypeName',
            'E.ID as EntityID',
            'E.Name as EntityName',
            'P.Name as PriorityName',
            'CF.FolderId',
            'C.SentDTS',
            'C.ExternalOutboundReference',
            'CO.Name as OrganizationName', // Fetch Organization Name
            db.raw(`
                (
                    SELECT CASE WHEN COUNT(*) >= 1 THEN 'Yes' ELSE 'No' END 
                    FROM cms.CorrespondenceFolder AS CF2
                    WHERE CF2.FolderId = CF.FolderId
                      AND CF2.CorrespondenceId <> C.ID
                ) AS HasLinkedCorrespondence`)
        )
        .leftJoin('dbo.LKEntityStucture as E', 'C.EntityId', 'E.ID')
        .leftJoin('dbo.LKCorrespondenceTypes as T', 'C.TypeID', 'T.ID')
        .leftJoin('dbo.LKStatuses as S', 'C.StatusID', 'S.ID')
        .leftJoin('dbo.LKPriorities as P', 'C.PriorityID', 'P.ID')
        .leftJoin('cms.CorrespondenceFolder as CF', 'C.ID', 'CF.CorrespondenceId') // Join CorrespondenceFolder
        .leftJoin('dbo.CorrespondenceContact as CC', 'C.ID', 'CC.CorrespondenceId') // Join CorrespondenceContact
        .leftJoin('dbo.ContactOrganizations as CO', 'CC.OrganizationId', 'CO.ID') // Join ContactOrganizations
        .where('C.IsDeleted', 0)
        .andWhere('C.CreatedDTS', '>=', '2025-01-01')
        .andWhere('T.Name', '=', 'InboundCorrespondence')
        .orderBy('C.CreatedDTS');


        console.log(`Fetched ${correspondences.length} records.`);

        const results = [];

        for (const correspondence of correspondences) {
            let linkedCorrespondences = [];
            let hasRecentOutboundLinked = false;
            
            const inv = await db('dbo.TaskAssignment as TA')
                .select(
                    'C.ID as CorrespondenceID',
                    'T.ID as TaskID',
                    db.raw(`
                        STUFF((
                            SELECT DISTINCT ', ' + U.FirstName 
                            FROM dbo.TaskAssignment TA2
                            LEFT JOIN dbo.Users U ON TA2.AssigneeUserID = U.ID
                            WHERE TA2.TaskID = T.ID AND U.FirstName IS NOT NULL
                            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') 
                        AS UserNames
                    `),
                    db.raw(`
                        STUFF((
                            SELECT DISTINCT ', ' + E.Name 
                            FROM dbo.TaskAssignment TA3
                            LEFT JOIN dbo.Users U ON TA3.AssigneeUserID = U.ID
                            LEFT JOIN dbo.LKEntityStucture E ON U.EntityID = E.ID
                            WHERE TA3.TaskID = T.ID AND E.Name IS NOT NULL
                            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') 
                        AS EntityNames
                    `)
                )
                .innerJoin('dbo.Tasks as T', 'TA.TaskID', 'T.ID')
                .innerJoin('dbo.Correspondences as C', 'T.CorrespondenceID', 'C.ID')
                .where('C.ID', correspondence.CorrespondenceID)
                .groupBy('C.ID', 'T.ID');
        
            const involvedUsers = [
                ...new Set(
                    inv.flatMap(row => (row.UserNames ? row.UserNames.split(', ') : []))
                ),
            ].join(', ');
        
            const involvedEntities = [
                ...new Set(
                    inv.flatMap(row => (row.EntityNames ? row.EntityNames.split(', ') : []))
                ),
            ].join(', ');
        
            if (correspondence.HasLinkedCorrespondence === 'Yes') {
                linkedCorrespondences = await db('dbo.Correspondences as C')
                    .select(
                        'C.ID as LinkedCorrespondenceID',
                        'C.Subject as LinkedCorrespondenceSubject',
                        'T.Name as CorrespondenceTypeName',
                        'C.CreatedDTS'
                    )
                    .leftJoin('cms.CorrespondenceFolder as CF', 'C.ID', 'CF.CorrespondenceId')
                    .leftJoin('dbo.LKCorrespondenceTypes as T', 'C.TypeID', 'T.ID')
                    .where('CF.FolderId', correspondence.FolderId)
                    .andWhereNot('C.ID', correspondence.CorrespondenceID)
                    .andWhere('C.IsDeleted', 0);
        
                hasRecentOutboundLinked = linkedCorrespondences.some(
                    (linked) =>
                        linked.CorrespondenceTypeName === 'OutBoundCorrespodence' &&
                        new Date(linked.CreatedDTS) > new Date(correspondence.CreatedDTS)
                );
            }
        
            // Fetch taskHistories
            const taskHistoriesData = await db.raw(`
                SELECT 
                    tp.SequenceId, 
                    tp.CreationDate,
                    t.AssignmentInstrucations 
                FROM 
                    dbo.TaskProcess tp
                INNER JOIN 
                    dbo.Correspondences c ON tp.correspondenceId = c.id 
                    AND c.published = 1 
                    AND c.isDeleted = 0
                INNER JOIN 
                    dbo.Tasks t ON tp.taskId = t.id
                LEFT JOIN 
                    dbo.TaskAssignment ta ON t.id = ta.taskId
                LEFT JOIN 
                    dbo.TaskHistory th ON tp.id = th.ActionId 
                LEFT JOIN 
                    dbo.Users u ON th.userId = u.id
                LEFT JOIN 
                    dbo.TaskHistoryAssignment tha ON th.id = tha.taskHistoryId
                WHERE 
                    tp.correspondenceId = ?
                    And t.AssignmentInstrucations is not null
                ORDER BY 
                    COALESCE(tp.sequenceNumber, 0) ASC, 
                    COALESCE(tp.subSequenceNumber, 0) ASC;
                `, [correspondence.CorrespondenceID]);

            const commentsData = await db.raw(`
               SELECT 
                    cc.Body ,
                    u.DisplayName 
                FROM 
                    dbo.CorrespondenceComments cc
                LEFT JOIN 
                    dbo.Users u ON cc.userId = u.id
                WHERE 
                    cc.correspondenceId = ?
                `, [correspondence.CorrespondenceID]);
        
            // Format taskHistories as a string with each entry on a new line
            const taskHistories = taskHistoriesData
                .map(th => `${th.SequenceId}: ${th.AssignmentInstrucations} at ${th.CreationDate}`)
                .join('\n');
            
           const comments = commentsData
                .map(th => `${th.Body}  by: ${th.DisplayName}}`)
                .join('\n');

                console.log("=========================", correspondence.CorrespondenceID)
        
            results.push({
                ...correspondence,
                linkedCorrespondences,
                HasRecentOutboundLinked: hasRecentOutboundLinked,
                involvedUsers,
                involvedEntities,
                taskHistories,
                comments
            });
        }
        

        return results;
    } catch (error) {
        console.error('Error fetching correspondences:', error);
        process.exit(1);
    }
}
async function exportToExcel(data) {
    const workbook = new ExcelJS.Workbook();

    // Group data by month
    const groupedByMonth = {};
    data.forEach(correspondence => {
        const month = moment(correspondence.CreatedDTS).format('YYYY-MM'); // Example: "2024-07"
        if (!groupedByMonth[month]) {
            groupedByMonth[month] = [];
        }
        groupedByMonth[month].push(correspondence);
    });

    // Create a worksheet for each month
    Object.keys(groupedByMonth).forEach(month => {
        const worksheet = workbook.addWorksheet(month);

        // Define the header row
        worksheet.addRow([
            'ID',
            'Reference Number',
            "External Outbound Reference",
            'Subject',
            "Date of Issuance by the Entity",
            'Link',
            'Sender Organization',
            'Entity Name',
            'Involved Users',
            'Involved Entities',
            'Created At',
            'Confidentiality',
            'Status',
            'Has Linked Correspondence',
            'Linked Correspondences',
            "Task Histories",
            "Comments"
        ]);

        // Format the headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' } // Light Gray background
        };

        groupedByMonth[month].forEach((correspondence, rowIndex) => {
            // Format linked correspondences
            let linkedCorrespondencesFormatted = '-';
            if (Array.isArray(correspondence.linkedCorrespondences) && correspondence.linkedCorrespondences.length > 0) {
                linkedCorrespondencesFormatted = correspondence.linkedCorrespondences.map(lc => {
                    const truncatedSubject = lc.LinkedCorrespondenceSubject // Limit to 50 characters
                    const link = `https://tarasol.mped.gov.eg/correspondences/${lc.LinkedCorrespondenceID}`;
                    return `---------------------------\nName: ${truncatedSubject}\nLink: ${link}\n---------------------------`;
                }).join('\n');
            }

            const row = worksheet.addRow([
                correspondence.CorrespondenceID,
                correspondence.ReferenceNumber,
                correspondence.ExternalOutboundReference,
                correspondence.Subject,
                correspondence.SentDTS,
                `https://tarasol.mped.gov.eg/correspondences/${correspondence.CorrespondenceID}`,
                correspondence.OrganizationName,
                correspondence.EntityName,
                correspondence.involvedUsers,
                correspondence.involvedEntities,
                correspondence.CreatedDTS,
                correspondence.IsConfidential ? 'Yes' : 'No',
                correspondence.StatusName,
                correspondence.HasLinkedCorrespondence,
                linkedCorrespondencesFormatted,
                correspondence.taskHistories,
                correspondence.comments
            ]);

            // Enable wrap text for Linked Correspondences column
            row.getCell(14).alignment = { wrapText: true, vertical: 'top' };

            // Adjust row height dynamically based on text length (count new lines)
            const lineCount = (linkedCorrespondencesFormatted.match(/\n/g) || []).length + 1; // Count lines
            row.height = Math.max(15, lineCount * 15); // Adjust row height (default 15, increases with lines)

            // Highlight row in red if HasRecentOutboundLinked is true
            if (correspondence.HasRecentOutboundLinked) {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFACD' } // Red background
                    };
                });
            }
        });

        // Adjust column widths
        worksheet.columns.forEach(column => {
            column.width = 20; // Adjust width to make text more readable
        });


        worksheet.getColumn(1).width = 10;
        worksheet.getColumn(3).width = 50;
        worksheet.getColumn(4).width = 50;
        worksheet.getColumn(10).width = 150; // Expand Linked Correspondences column
    });

    await workbook.xlsx.writeFile('correspondences.xlsx');
    console.log('✅ Excel file saved as correspondences.xlsx');
}


async function main() {
    const correspondences = await fetchCorrespondences();
    await exportToExcel(correspondences);
    db.destroy(); // Close DB connection
}

main();
