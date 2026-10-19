// Creates/updates a Firebase Authentication account for every teacher in index.html's
// `teacherAccounts`, and writes /teacherRoles/{uid} -- the data database.rules.json uses
// to decide which classes/subjects each teacher may read and write.
//
// Run again whenever teacherAccounts changes (new teacher, new class/subject assignment).
//
//   cd firebase && npm install
//   node setup-teachers.mjs                     # create missing accounts + sync roles
//   node setup-teachers.mjs --reset KHU03 KHU07 # also issue new passwords for these
//   node setup-teachers.mjs --reset-all         # new passwords for everyone
//
// New passwords are written to firebase/initial-passwords.csv (git-ignored) for the
// admin to hand out. Existing accounts keep their password unless reset.
//
// Needs firebase/service-account.json (Firebase Console > Project settings >
// Service accounts > Generate new private key). Never commit that file.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import admin from 'firebase-admin';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = 'https://haakkeo-m51-grades-default-rtdb.asia-southeast1.firebasedatabase.app';
// Must match TEACHER_EMAIL_DOMAIN in index.html: teachers type only their code (KHU01),
// the app signs in as khu01@<domain>.
const TEACHER_EMAIL_DOMAIN = 'haakkeo-m51-grades.firebaseapp.com';
// Academic-affairs viewer with read-only access to every class (see isAcademicOverseer()).
const OVERSEER_CODES = ['KHU24'];

function loadTeacherAccounts() {
    const html = readFileSync(path.join(here, '..', 'index.html'), 'utf8');
    const match = html.match(/const teacherAccounts = (\{[\s\S]*?\n\s*\});/);
    if (!match) throw new Error('Could not find `const teacherAccounts = {...};` in index.html');
    return vm.runInNewContext('(' + match[1] + ')');
}

function rolesFor(code, account) {
    const homeroom = {};
    (account.homeroomClasses || []).forEach(classKey => { homeroom[classKey] = true; });
    const subjects = {};
    (account.subjectRoles || []).forEach(({ classKey, subject }) => {
        subjects[classKey] = subjects[classKey] || {};
        subjects[classKey][subject] = true;
    });
    return {
        code,
        isAdmin: account.isAdmin === true,
        overseer: OVERSEER_CODES.includes(code) || account.isAdmin === true,
        homeroom,
        subjects
    };
}

// 8 characters, no look-alikes (0/O, 1/l/I).
function generatePassword() {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[randomInt(alphabet.length)];
    return out;
}

async function main() {
    const args = process.argv.slice(2);
    const resetAll = args.includes('--reset-all');
    const resetCodes = new Set(args.filter(a => !a.startsWith('--')).map(a => a.toUpperCase()));

    const keyPath = path.join(here, 'service-account.json');
    // FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_DATABASE_EMULATOR_HOST: local test run, no key needed.
    const usingEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
    if (!usingEmulator && !existsSync(keyPath)) {
        throw new Error(`Missing ${keyPath} -- download it from Firebase Console > Project settings > Service accounts.`);
    }
    admin.initializeApp({
        ...(usingEmulator ? { projectId: process.env.GCLOUD_PROJECT || 'demo-haakkeo' }
                          : { credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) }),
        databaseURL: process.env.FIREBASE_DATABASE_EMULATOR_HOST
            ? `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=haakkeo-m51-grades-default-rtdb`
            : DATABASE_URL
    });
    const auth = admin.auth();
    const db = admin.database();

    const teacherAccounts = loadTeacherAccounts();
    const issued = [];
    const roles = {};

    for (const [code, account] of Object.entries(teacherAccounts)) {
        // uid = login code, so /teacherRoles/KHU01 is easy to read in the console.
        const uid = code;
        const email = `${code.toLowerCase()}@${TEACHER_EMAIL_DOMAIN}`;
        let user = null;
        try { user = await auth.getUser(uid); } catch (err) {
            if (err.code !== 'auth/user-not-found') throw err;
        }

        if (!user) {
            const password = generatePassword();
            await auth.createUser({ uid, email, password, displayName: account.name, emailVerified: true });
            issued.push([code, account.name, password]);
            console.log(`created  ${code}`);
        } else {
            const update = { email, displayName: account.name };
            if (resetAll || resetCodes.has(code)) {
                update.password = generatePassword();
                issued.push([code, account.name, update.password]);
                console.log(`reset    ${code}`);
            } else {
                console.log(`exists   ${code}`);
            }
            await auth.updateUser(uid, update);
        }
        roles[uid] = rolesFor(code, account);
    }

    // Replace the whole node so removed teachers / removed assignments lose access.
    await db.ref('teacherRoles').set(roles);
    console.log(`\n/teacherRoles written for ${Object.keys(roles).length} teachers.`);

    // Old browser-side login stored plain-text passwords here; no longer used.
    await db.ref('teacherPasswords').remove();

    if (issued.length) {
        const csvPath = path.join(here, 'initial-passwords.csv');
        const csv = ['code,name,password', ...issued.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        writeFileSync(csvPath, '﻿' + csv + '\n'); // BOM so Excel shows Lao text correctly
        console.log(`${issued.length} new password(s) written to ${csvPath} -- hand them out, then delete the file.`);
    }
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
