const knex = require('knex');

const Promise = require('bluebird');
const { render } = require('json2html');
const XLSX = require('xlsx');
const fs = require('fs');

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

async function fetchAttachmentsByEntity() {
    try {

        const attachments = await db('Attachments').select('*');
        console.log(attachments.length);
        // Fetch attachments

        const result = await Promise.map(
            attachments,
            async (attachment) => {
                const [
                    taskLink,
                    commentLink,
                    historyLink,
                    correspondenceLink,
                ] = await Promise.all([
                    db('TaskAttachmentLookup')
                        .join('Tasks', 'TaskAttachmentLookup.TaskID', 'Tasks.ID') // Join with the Tasks table
                        .select('Tasks.CorrespondenceID') // Select CorrespondenceID
                        .where('TaskAttachmentLookup.AttachmentID', attachment.ID) // Filter by AttachmentID
                        .first(),
                    db('CommentsAttachmentLookup as cal')
                        .join('CorrespondenceComments as cc', 'cal.CommentID', 'cc.ID')
                        .select('cc.CorrespondenceID')
                        .where('cal.AttachmentID', attachment.ID)
                        .first(),
                    db('TaskHistoryAssignment')
                        .join('TaskHistoryAttachment', 'TaskHistoryAssignment.TaskHistoryId', 'TaskHistoryAttachment.TaskHistoryId') // Join with TaskHistoryAttachment
                        .join('Tasks', 'TaskHistoryAssignment.TaskId', 'Tasks.ID') // Join with Tasks table
                        .select('Tasks.CorrespondenceID') // Select CorrespondenceID
                        .where('TaskHistoryAttachment.AttachmentId', attachment.ID) // Filter by AttachmentID
                        .first(),
                    db('CorrespondenceAttachmentLookup')
                        .select('CorrespondenceID')
                        .where('AttachmentID', attachment.ID)
                        .first(),
                ]);

                return {
                    attachmentId: attachment.ID,
                    size: attachment.FileSize,
                    taskLink,
                    commentLink,
                    historyLink,
                    correspondenceLink,
                }
            },
            { concurrency: 5 } // Adjust concurrency based on performance
        );

        const { knownAttachments, unknownAttachments } = result.reduce(
            (acc, item) => {
                const { attachmentId, size } = item;
                let isKnown = false;

                if (item.taskLink) {
                    acc.knownAttachments.push({ attachmentId, size, correspondenceId: item.taskLink.CorrespondenceID });
                    isKnown = true;
                }

                if (item.commentLink) {
                    acc.knownAttachments.push({ attachmentId, size, correspondenceId: item.commentLink.CorrespondenceID });
                    isKnown = true;
                }

                if (item.historyLink) {
                    acc.knownAttachments.push({ attachmentId, size, correspondenceId: item.historyLink.CorrespondenceID });
                    isKnown = true;
                }

                if (item.correspondenceLink) {
                    acc.knownAttachments.push({ attachmentId, size, correspondenceId: item.correspondenceLink.CorrespondenceID });
                    isKnown = true;
                }

                if (!isKnown) {
                    acc.unknownAttachments.push(attachmentId, size);
                }

                return acc;
            },
            { knownAttachments: [], unknownAttachments: [] }
        );
        console.log('Known Attachments:', knownAttachments.length);
        console.log('Unknown Attachments:', unknownAttachments.length);

        const aggregatedAttachments = knownAttachments.reduce((acc, { correspondenceId, size }) => {
            if (!acc[correspondenceId]) {
                acc[correspondenceId] = { totalMB: 0, count: 0 };
            }
            // Assuming 'size' is in KB; dividing by 1024 to get MB.
            acc[correspondenceId].totalMB += size / 1024;
            acc[correspondenceId].count++;
            return acc;
        }, {});

        // Filter to keep only correspondences with more than 10 MB total attachments.
        const filteredAttachments = Object.entries(aggregatedAttachments)
            .filter(([id, { totalMB }]) => totalMB > 10)
            .reduce((acc, [id, data]) => {
                acc[id] = data;
                return acc;
            }, {});

        // Get the list of correspondence IDs that pass the filter.
        const filteredIds = Object.keys(filteredAttachments).map(Number);

        // Step 2: Query the database for these correspondences.
        const correspondences = await db('Correspondences as C')
            .select(
                'C.ID as CorrespondenceID',
                "C.Subject",
                'C.CreatorUserID',
                'E.ID as EntityID',
                'E.Name as EntityName',
                'U.Username',
                'U.DisplayName'
            )
            .leftJoin('Users as U', 'C.CreatorUserID', 'U.ID')
            .leftJoin('LKEntityStucture as E', 'C.EntityId', 'E.ID')
            .leftJoin('LKCorrespondenceTypes as T', 'C.TypeID', 'T.ID')
            .leftJoin('LKStatuses as S', 'C.StatusID', 'S.ID')
            .leftJoin('LKPriorities as P', 'C.PriorityID', 'P.ID')
            .whereIn('C.ID', filteredIds)
            .orderBy('C.ID');

        // Merge the correspondence details with the corresponding attachment stats.
        const finalResults = correspondences.map(correspondence => ({
            ...correspondence,
            ...filteredAttachments[correspondence.CorrespondenceID]
        }));
        const worksheet = XLSX.utils.json_to_sheet(finalResults);

// Create a new workbook and append the worksheet
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

// Write to an Excel file with UTF-8 encoding
XLSX.writeFile(workbook, "table-prod2.xlsx");

        // const tableHtml = render(finalResults, {
        //     table: true, // Automatically generates a table
        //   });
          
        //   // Wrap the table in a basic HTML structure
        //   const htmlContent = `
        //   <html>
        //     <head><title>JSON Table</title></head>
        //     <body>${tableHtml}</body>
        //   </html>`;
          
        //   // Write to an HTML file
        //   fs.writeFileSync('table-prod2.html', htmlContent);

    } catch (error) {
        console.error('Error fetching attachments:', error);
    } finally {
        await db.destroy();
    }
}

fetchAttachmentsByEntity();