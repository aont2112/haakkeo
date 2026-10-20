// Loads the student rosters into the database. They used to be embedded in index.html,
// where anyone could read every student's birthdate and parents' phone numbers with
// "View source" and no sign-in. In the database they are covered by database.rules.json.
//
// The data is read from an OLD copy of index.html that still contains it, kept only on the
// admin's computer (firebase/roster-source.html is git-ignored):
//
//   git show 4aa0276:index.html > firebase/roster-source.html
//   cd firebase && npm install
//   node seed-students.mjs                 # load, then delete roster-source.html
//
// For each class (11 ... 72):
//   /classes/{k}/students      written ONLY if empty, so rosters teachers have already
//                              edited (grades are keyed by student id) are never touched.
//   /classes/{k}/rosterImport  names + nicknames from the latest Excel, used by the
//                              "ນຳເຂົ້າລາຍຊື່ໃໝ່ (Excel)" button. Always overwritten.
//
// Needs firebase/service-account.json, same as setup-teachers.mjs.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import admin from 'firebase-admin';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = 'https://haakkeo-m51-grades-default-rtdb.asia-southeast1.firebasedatabase.app';

function loadRosters(sourcePath) {
    const html = readFileSync(sourcePath, 'utf8');
    const match = html.match(/(const defaultStudents11 = \[[\s\S]*?const defaultRostersByClass = \{[\s\S]*?\n\s*\};)/);
    if (!match) throw new Error(`Could not find the embedded rosters (defaultStudents11 ... defaultRostersByClass) in ${sourcePath}`);
    return vm.runInNewContext(match[1] + '\n({ rosters: defaultRostersByClass, imports: newRosterFromExcel })');
}

async function main() {
    const sourcePath = path.resolve(process.argv[2] || path.join(here, 'roster-source.html'));
    if (!existsSync(sourcePath)) {
        throw new Error(`Missing ${sourcePath} -- create it with: git show 4aa0276:index.html > firebase/roster-source.html`);
    }
    const { rosters, imports } = loadRosters(sourcePath);

    const keyPath = path.join(here, 'service-account.json');
    // FIREBASE_DATABASE_EMULATOR_HOST: local test run, no key needed.
    const usingEmulator = !!process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    if (!usingEmulator && !existsSync(keyPath)) {
        throw new Error(`Missing ${keyPath} -- download it from Firebase Console > Project settings > Service accounts.`);
    }
    admin.initializeApp({
        ...(usingEmulator ? { projectId: process.env.GCLOUD_PROJECT || 'demo-haakkeo' }
                          : { credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) }),
        databaseURL: usingEmulator
            ? `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=haakkeo-m51-grades-default-rtdb`
            : DATABASE_URL
    });
    const db = admin.database();

    let total = 0;
    for (const classKey of Object.keys(rosters)) {
        const studentsRef = db.ref(`classes/${classKey}/students`);
        if ((await studentsRef.get()).exists()) {
            console.log(`kept     ${classKey} (roster already in the database)`);
        } else {
            await studentsRef.set(rosters[classKey]);
            total += rosters[classKey].length;
            console.log(`seeded   ${classKey} (${rosters[classKey].length} students)`);
        }
        if (imports[classKey]) await db.ref(`classes/${classKey}/rosterImport`).set(imports[classKey]);
    }
    console.log(`\n${total} students written. rosterImport written for ${Object.keys(imports).length} classes.`);
    console.log(`Now delete ${sourcePath}.`);
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
