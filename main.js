const knex = require('knex');
const fs = require('fs').promises;
const path = require('path');

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

const EntityCodes = {
    1: { entityTypeId: 1, name: "الجهاز المركزي للتعبئة العامة والإحصاء", hierarchyId: "/1", code: "D0123" },
    2: { entityTypeId: 2, name: "رئاسة الجهاز المركزي للتعبئة العامة والإحصاء", hierarchyId: "/1/2", code: "D0000" },
    3: { entityTypeId: 3, name: "رئيس الجهاز", hierarchyId: "/1/2/3", code: "D0000" },
    4: { entityTypeId: 5, name: "الادارة العامة للمكتب الفني لرئيس الجهاز", hierarchyId: "/1/2/4", code: "D0010" },
    5: { entityTypeId: 5, name: "الادارة العامة للمراجعة الداخلية والحوكمة", hierarchyId: "/1/2/5", code: "D0020" },
    6: { entityTypeId: 5, name: "الادارة العامة للادارة الاستراتيجية", hierarchyId: "/1/2/6", code: "D0030" },
    7: { entityTypeId: 6, name: "الادارة المركزية لشئون مكتب رئيس الجهاز", hierarchyId: "/1/2/7", code: "D0100" },
    8: { entityTypeId: 5, name: "الادارة العامة للتنسيق والسكرتارية", hierarchyId: "/1/2/7/8", code: "D0110" },
    9: { entityTypeId: 5, name: "الادارة العامة للعلاقات العامة", hierarchyId: "/1/2/7/9", code: "D0120" },
    10: { entityTypeId: 5, name: "الادارة العامة لخدمة المواطنين", hierarchyId: "/1/2/7/10", code: "D0130" },
    11: { entityTypeId: 5, name: "الادارة العامة للشئون الفنية / رئاسة الجهاز", hierarchyId: "/1/2/7/11", code: "D0140" },
    12: { entityTypeId: 5, name: "الادارة العامة للامن", hierarchyId: "/1/2/7/12", code: "D0150" },
    13: { entityTypeId: 5, name: "الادارة العامة للتعاون الدولي", hierarchyId: "/1/2/7/13", code: "D0180" },
    14: { entityTypeId: 5, name: "الادارة العامة لتقييم ومراقبة جودة البيانات", hierarchyId: "/1/2/7/14", code: "D0190" },
    15: { entityTypeId: 6, name: "الادارة المركزية لمركز تنمية الموارد البشرية", hierarchyId: "/1/2/15", code: "D0200" },
    16: { entityTypeId: 5, name: "الادارة العامة للشئون المالية والادارية", hierarchyId: "/1/2/15/16", code: "D0210" },
    17: { entityTypeId: 5, name: "الادارة العامة لتخطيط البرامج التدريبية", hierarchyId: "/1/2/15/17", code: "D0220" },
    18: { entityTypeId: 5, name: "الادارة العامة لتنفيذ البرامج التدريبية", hierarchyId: "/1/2/15/18", code: "D0230" },
    19: { entityTypeId: 5, name: "الادارة العامة لمتابعة وتقييم البرامج التدريبية", hierarchyId: "/1/2/15/19", code: "D0240" },
    20: { entityTypeId: 6, name: "الادارة المركزية للشئون القانونية", hierarchyId: "/1/2/20", code: "D0300" },
    21: { entityTypeId: 5, name: "الادارة العامة للتحقيقات والتظلمات والشكاوى", hierarchyId: "/1/2/20/21", code: "D0310" },
    22: { entityTypeId: 5, name: "الادارة العامة للقضايا والفتوى والتشريع والعقود", hierarchyId: "/1/2/20/22", code: "D0320" },
    23: { entityTypeId: 4, name: "قطاع الامانة العامة", hierarchyId: "/1/23", code: "D2000" },
    24: { entityTypeId: 5, name: "الادارة العامة للشئون الفنية و المتابعة / قطاع الامانة العامة", hierarchyId: "/1/23/24", code: "D2010" },
    25: { entityTypeId: 6, name: "الادارة المركزية للموارد البشرية", hierarchyId: "/1/23/25", code: "D2100" },
    26: { entityTypeId: 5, name: "الادارة العامة للتطوير المؤسسي", hierarchyId: "/1/23/25/26", code: "D2110" },
    27: { entityTypeId: 5, name: "الادارة العامة لادارة وتنمية المواهب", hierarchyId: "/1/23/25/27", code: "D2120" },
    28: { entityTypeId: 5, name: "الادارة العامة لعمليات الموارد البشرية", hierarchyId: "/1/23/25/28", code: "D2130" },
    29: { entityTypeId: 5, name: "الادارة العامة للاستحقاقات والمزايا", hierarchyId: "/1/23/25/29", code: "D2140" },
    30: { entityTypeId: 6, name: "الادارة المركزية للشئون المالية والادارية", hierarchyId: "/1/23/30", code: "D2110" },
    31: { entityTypeId: 5, name: "الادارة العامة للشئون المالية", hierarchyId: "/1/23/30/31", code: "D2130" },
    32: { entityTypeId: 5, name: "الادارة العامة للشئون الادارية", hierarchyId: "/1/23/30/32", code: "D2140" },
    40: {
        entityTypeId: 5, name: "الادارة العامة للشئون الفنية والتخطيط والمتابعة / قطاع تكنولوجيا المعلومات",
        hierarchyId: "/1/39/40", code: "D2140"
    },
};

const CHUNK_SIZE = 15;
let ALL_CORRESPONDENCES = [];
let ALL_CORRESPONDENCESTITIES = [];
const ALL_CORRESPONDENCES_WITH_FOLDERS = new Map();
const campmasCode = "007002"
let startFolderCode = "00000";

function getNextCode(code) {
    return (parseInt(code, 10) + 1).toString().padStart(5, '0');
}

async function getAllCorrespondences() {
    try {
        console.log('Getting all correspondences in chunks...');
        let offset = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            const correspondences = await db('Correspondences as C')
                .select(
                    'C.ID as CorrespondenceID',
                    'C.CreatorUserID',
                    'C.TypeID',
                    'C.StatusID',
                    'C.SourceID',
                    'C.PriorityID',
                    'C.Subject',
                    'C.SentDTS',
                    'C.ReceivedDTS',
                    'C.DueDTS',
                    'C.OrganizationID',
                    'C.ContactEmployeeID',
                    'C.ReferenceNumber',
                    'C.IsDeleted',
                    'C.DeleteDate',
                    'C.IsArchived',
                    'C.CreatedDTS',
                    'C.DeliveryDTS',
                    'C.IsConfidential',
                    'C.EntityId',
                    'C.SubjectName',
                    'C.LetterID',
                    'C.Published',
                    'C.ExternalOutboundReference',
                    'C.ClosedDate',
                    'C.SanitizedSubject',
                    'C.SubjectNames',
                    'C.IsMultiPurpose',
                    'E.ID as EntityID',
                    'E.Name as EntityName',
                    'E.ParentID',
                    'E.EntityTypeID',
                    'E.HierarchyId',
                    'E.logo',
                    'T.ID as CorrespondenceTypeID',
                    'T.Name as CorrespondenceTypeName',
                    'S.ID as StatusID',
                    'S.Name as StatusName',
                    'P.ID as PriorityID',
                    'P.Name as PriorityName',
                    'P.Note as PriorityNote',
                    'P.Color as PriorityColor',
                    'P.SLA as PrioritySLA'
                )
                .leftJoin('LKEntityStucture as E', 'C.EntityId', 'E.ID')
                .leftJoin('LKCorrespondenceTypes as T', 'C.TypeID', 'T.ID')
                .leftJoin('LKStatuses as S', 'C.StatusID', 'S.ID')
                .leftJoin('LKPriorities as P', 'C.PriorityID', 'P.ID')
                .where('C.IsDeleted', 0)
                .orderBy('C.ID')
                .offset(offset)
                .limit(CHUNK_SIZE);

            if (correspondences.length > 0) {
                ALL_CORRESPONDENCES = ALL_CORRESPONDENCES.concat(correspondences);
                offset += CHUNK_SIZE;
                hasMoreData = false;
            } else {
                hasMoreData = false; // No more data left
            }
        }

        console.log(`Fetched total correspondences: ${ALL_CORRESPONDENCES.length}`);
        return ALL_CORRESPONDENCES;
    } catch (error) {
        console.error('Error fetching correspondences:', error);
        throw error;
    }
}


async function categorizeCorrespondence(correspondences) {
    const categorizedCorrespondences = new Map();

    for (const corr of correspondences) {
        const queryResult = await
            db('Tasks as t')
                .leftJoin('TaskAssignment as ta', 'ta.TaskID', 't.ID')
                .leftJoin('Users as u_creator', 't.CreatorUserID', 'u_creator.ID')
                .leftJoin('Users as u_assignee', 'ta.AssigneeUserID', 'u_assignee.ID')
                .leftJoin('Correspondences as c', 't.CorrespondenceID', 'c.ID')
                .select('u_assignee.EntityID as AssigneeEntityID')
                .max('u_creator.EntityID as CreatorEntityID')
                .select('ta.AssigneeEntityID')
                .where('c.ID', corr.CorrespondenceID)
                .groupBy('u_assignee.EntityID', 'ta.AssigneeEntityID');



        queryResult.forEach(row => {
            const entityId = Array.isArray(row.AssigneeEntityID)
                ? row.AssigneeEntityID.find(item => item !== null)
                : row.AssigneeEntityID;

            const creatorEntityId = row.CreatorEntityID;

            const assigneeKey = EntityCodes[Number(entityId)]?.code || 'Unknown';
            const creatorKey = EntityCodes[Number(creatorEntityId)]?.code || 'Unknown';

            if (!categorizedCorrespondences.has(assigneeKey)) {
                categorizedCorrespondences.set(assigneeKey, []);
            }

            if (!categorizedCorrespondences.has(creatorKey)) {
                categorizedCorrespondences.set(creatorKey, []);
            }

            categorizedCorrespondences.get(assigneeKey).push({
                correspondenceId: corr.CorrespondenceID,
                creatorEntityId,
                assigneeEntityId: entityId,
                type: 'assignee'
            });

            categorizedCorrespondences.get(creatorKey).push({
                correspondenceId: corr.CorrespondenceID,
                creatorEntityId,
                assigneeEntityId: entityId,
                type: 'creator'
            });
        });

        if (queryResult.length === 0) {
            const entityId = corr.EntityId;

            if (!categorizedCorrespondences.has(EntityCodes[Number(entityId)].code)) {
                categorizedCorrespondences.set(EntityCodes[Number(entityId)].code, []);
            }
            categorizedCorrespondences.get(EntityCodes[Number(entityId)].code).push({
                correspondenceId: corr.CorrespondenceID,
                creatorEntityId: corr.EntityId,
                assigneeEntityId: null
            });
        }
    }

    const data = Object.fromEntries(categorizedCorrespondences);

    ALL_CORRESPONDENCESTITIES = data;
}

async function validateCorrespondence() {

    Object.entries(ALL_CORRESPONDENCESTITIES).forEach(([key, entries]) => {
        let folderIndex = 0; // Start folder index
        let correspondenceIndex = 0; // Start correspondence index
        const updatedEntries = []; // Store updated correspondences for this entity

        entries.forEach((item) => {
            const correID = item.correspondenceId;
            const folderName = folderIndex.toString().padStart(5, '0'); // Format as 5-digit string
            const correspondenceNum = correspondenceIndex.toString().padStart(3, '0'); // Format as 3-digit string

            // Find the full correspondence details
            const fullCorrespondence = ALL_CORRESPONDENCES.find(
                corr => corr.CorrespondenceID === correID
            );

            if (!fullCorrespondence) {
                console.log(`No matching correspondence found for ID ${correID} in ALL_CORRESPONDENCES`);
                return;
            }

            const updatedCorrespondence = {
                ...fullCorrespondence,
                entityCode: key,
                folderName,
                correspondenceNum,
                creatorEntityId: item.creatorEntityId,
                assigneeEntityId: item.assigneeEntityId,
                creatorEntitycode: EntityCodes[Number(item.creatorEntityId)].code,
                assigneeEntitycode: item.assigneeEntityId ? EntityCodes[Number(item.assigneeEntityId)].code : null,
                creatorEntityName: EntityCodes[Number(item.creatorEntityId)].name,
                assigneeEntityName: item.assigneeEntityId ? EntityCodes[Number(item.assigneeEntityId)].name : null,
            };

            updatedEntries.push(updatedCorrespondence);

            // Increment correspondence count
            correspondenceIndex++;

            // If correspondenceIndex reaches 1000, reset and move to next folder
            if (correspondenceIndex >= 1000) {
                correspondenceIndex = 0;
                folderIndex++;
            }
        });

        // Store updated correspondences in the map with entityCode as the key
        ALL_CORRESPONDENCES_WITH_FOLDERS.set(key, updatedEntries);
    });
}


async function processCorrespondences() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const rootFolder = `10-Batches-${date}`;

    await fs.mkdir(rootFolder, { recursive: true });

    for (const [entityCode, correspondences] of ALL_CORRESPONDENCES_WITH_FOLDERS.entries()) {
        const batchFolder = path.join(rootFolder, `BATCH-${entityCode}-000592`);
        const docCatFolder = path.join(batchFolder, 'DOCCAT0059');
        const finalFolder = path.join(docCatFolder, 'P087');

        // Create directories in a nested manner
        await fs.mkdir(finalFolder, { recursive: true });

        console.log(`Created folder: ${finalFolder}`);

        for (const [index, correspondence] of correspondences.entries()) {
            const fullCode = `${campmasCode}${entityCode}${correspondence.folderName}${correspondence.correspondenceNum}`;
            await generateXML(correspondence, fullCode, docCatFolder);
        }
    }
}


async function generateXML(corr, fullCode, docCatFolder) {
    const xmlHeader = '<?xml version="1.0" standalone="yes"?>\n<DocumentElement>\n';
    const xmlFooter = '</DocumentElement>';
    const xmlBody = `
                <Field Name="رقم الصادرالداخلى">${corr.ReferenceNumber || '#ARMNEWEGNC#'}</Field>
                <Field Name="تاريخ المراسلة">${corr.SentDTS ? corr.SentDTS.toISOString().split('T')[0] : '#ARMNEWEGNC#'}/Field>
                <Field Name="رقم التسجيل بدفتر الصادر">#ARMNEWEGNC#</Field>
                <Field Name="رقم التسجيل بدفتر الوارد">#ARMNEWEGNC#</Field>
                <Field Name="نسخة الى">#ARMNEWEGNC#</Field>
                <Field Name="نوع المراسلة">${corr.CorrespondenceTypeName || '#ARMNEWEGNC#'}</Field>
                <Field Name="الرقم المرجعي">${corr.CorrespondenceID || '#ARMNEWEGNC#'}</Field>
                <Field Name="درجة الاهمية (الأولوية)">${corr.PriorityName || '#ARMNEWEGNC#'}</Field>
                <Field Name="الموضوع">${corr.Subject || '#ARMNEWEGNC#'}</Field>
                <Field Name="الادارة المرسل اليها">${corr.assigneeEntityName || '#ARMNEWEGNC#'}</Field>
                <Field Name="الإدارة الراسلة">${corr.creatorEntityName || '#ARMNEWEGNC#'}</Field>
                <Field Name="حالة العرض">#ARMNEWEGNC#</Field>
                <Field Name="تاريخ التأشيرة">#ARMNEWEGNC#</Field>
                <Field Name="التأشيرة">#ARMNEWEGNC#</Field>
                <Field Name="الملحقات">#ARMNEWEGNC#</Field>
                <Field Name="يحتاج متابعة">#ARMNEWEGNC#</Field>
                <Field Name="حالة المتابعة">#ARMNEWEGNC#</Field>
                <Field Name="ملاحظات">#ARMNEWEGNC#</Field>
                <Field Name="الباركود">${EntityCodes[corr.EntityID] || '#ARMNEWEGNC#'}</Field>
                <Field Name="سرية الملف">${corr.IsConfidential ? 'سري' : 'غير سري'}</Field>
                <Field Name="سرية الوثيقة">${corr.IsConfidential ? 'سري' : 'غير سري'}</Field>
                <Field Name="كود الوثيقة">${EntityCodes[corr.EntityID] || '#ARMNEWEGNC#'}</Field>
                <Field Name="كود الصندوق">${EntityCodes[corr.EntityID] || '#ARMNEWEGNC#'}</Field>
                <Field Name="كود المستودع">'#ARMNEWEGNC#'</Field>
                <Field Name="كود المنطقة">'#ARMNEWEGNC#'</Field>
                <Field Name="كود الوحدة">'#ARMNEWEGNC#'</Field>
                <Field Name="كود الرف">'#ARMNEWEGNC#'</Field>
                <Field Name="عنوان الملف">${corr.CorrespondenceTypeName || '#ARMNEWEGNC#'}</Field>
                <Field Name="مرجع الملف">'#ARMNEWEGNC#'</Field>
                <Field Name="كلمات دلالية">${corr.SubjectNames}</Field>
                <Field Name="التصنيف">فني</Field>
                <Field Name="نوع الوثيقة">${corr.CorrespondenceTypeName || '#ARMNEWEGNC#'}</Field>
                <Field Name="العنوان">${corr.SubjectName || '#ARMNEWEGNC#'}</Field>
                <Field Name="التاريخ">${corr.CreatedDTS}</Field>
                <Field Name="المرجع"></Field>
                <Field Name="كود الوحدة التنظيمية">${corr.creatorEntitycode}</Field>
                <Field Name="الفئة العامة">${corr.CorrespondenceTypeName || '#ARMNEWEGNC#'}</Field>
                <Field Name="كود الملف">${fullCode}</Field>
                <Field Name="ملاحظات">#ARMNEWEGNC#</Field>
                <Field Name="الوصف التفصيلى">#ARMNEWEGNC#</Field>
                <Field Name="اسم الحقل التخصصى1">#ARMNEWEGNC#</Field>
                <Field Name="قيمة الحقل التخصصى 1">#ARMNEWEGNC#</Field>
                <Field Name="اسم الحقل التخصصى2">#ARMNEWEGNC#</Field>
                <Field Name="قيمة الحقل التخصصى 2">#ARMNEWEGNC#</Field>
                <Field Name="مكان الحفظ الورقى">#ARMNEWEGNC#</Field>
                <Field Name="الفئة الفرعية">#ARMNEWEGNC#</Field>        
        `;



    const xmlContent = xmlHeader + xmlBody + xmlFooter;
    const filePath = path.join(docCatFolder, `Project_Fields.xml`);
    fs.writeFile(filePath, xmlContent, 'utf8');
    console.log(`XML file generated successfully: ${filePath}`);
}

getAllCorrespondences()
    .then(categorizeCorrespondence)
    .then(validateCorrespondence)
    .then(processCorrespondences)
    //.then(generateXML)
    .then(() => db.destroy())
    .catch((error) => {
        console.error('Error:', error);
        db.destroy();
    });
