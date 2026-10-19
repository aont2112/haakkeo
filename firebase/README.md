# Firebase Authentication + Security Rules

ລະບົບບໍ່ໄດ້ກວດລະຫັດຜ່ານຢູ່ຝັ່ງ browser ອີກແລ້ວ. ຄູເຂົ້າລະບົບຜ່ານ **Firebase Authentication**
(ພິມລະຫັດຄູ ເຊັ່ນ `KHU01` ຄືເກົ່າ — ແອັບແປງເປັນ `khu01@haakkeo-m51-grades.firebaseapp.com` ເອງ),
ແລະ **Realtime Database Rules** (`database.rules.json`) ກວດສິດທຸກການອ່ານ/ຂຽນຢູ່ຝັ່ງ server.

## ໃຜເຂົ້າເຖິງຫຍັງໄດ້

| ບົດບາດ | ອ່ານ | ຂຽນ |
|---|---|---|
| ຄູປະຈຳຫ້ອງ (`homeroomClasses`) | ທຸກຢ່າງຂອງຫ້ອງຕົນ | ລາຍຊື່, ຄວາມປະພຶດ, ວັນທີອອກໃບຄະແນນ, ຄະແນນທຸກວິຊາ ຂອງຫ້ອງຕົນ |
| ຄູສອນວິຊາ (`subjectRoles`) | ລາຍຊື່ນັກຮຽນ, ວັນທີອອກໃບຄະແນນ, ຄະແນນ **ວິຊາທີ່ຕົນສອນ** ໃນຫ້ອງນັ້ນ | ຄະແນນ **ວິຊາທີ່ຕົນສອນ** ໃນຫ້ອງນັ້ນເທົ່ານັ້ນ |
| ວິຊາການ (KHU24) | ທຸກຫ້ອງ (ອ່ານຢ່າງດຽວ) | ສະເພາະວິຊາທີ່ຕົນສອນ |
| Admin (`isAdmin: true`) | ທຸກຫ້ອງ | ທຸກຫ້ອງ |
| ຄົນທີ່ບໍ່ໄດ້ເຂົ້າລະບົບ | ບໍ່ມີ | ບໍ່ມີ |

ສິດເຫຼົ່ານີ້ເກັບຢູ່ `/teacherRoles/{uid}` ໃນຖານຂໍ້ມູນ, ຂຽນໄດ້ໂດຍ `setup-teachers.mjs` ເທົ່ານັ້ນ
(browser ແກ້ສິດຕົນເອງບໍ່ໄດ້). ສະຄຣິບສ້າງ `/teacherRoles` ຈາກ `teacherAccounts` ໃນ `index.html`.

## ຕິດຕັ້ງຄັ້ງທຳອິດ (admin ເຮັດຄັ້ງດຽວ)

1. Firebase Console → **Authentication** → Get started → Sign-in method → ເປີດ **Email/Password**.
2. Firebase Console → Project settings → **Service accounts** → *Generate new private key*,
   ບັນທຶກເປັນ `firebase/service-account.json` (**ຢ່າ commit** — ຢູ່ໃນ `.gitignore` ແລ້ວ).
3. ສ້າງບັນຊີຄູ ແລະ ສິດ (ຕ້ອງມີ Node.js 18+):
   ```bash
   cd firebase
   npm install
   node setup-teachers.mjs
   ```
   ລະຫັດຜ່ານໃໝ່ຂອງຄູທຸກຄົນຈະຢູ່ໃນ `firebase/initial-passwords.csv` → ແຈກໃຫ້ຄູ ແລ້ວ **ລຶບໄຟລ໌ນີ້ຖິ້ມ**.
   ສະຄຣິບລຶບ `/teacherPasswords` (ລະຫັດຜ່ານແບບເກົ່າທີ່ເກັບເປັນຂໍ້ຄວາມທຳມະດາ) ອອກນຳ.
4. Deploy Rules (ຕ້ອງເຮັດ **ຫຼັງ** ຂັ້ນ 3, ບໍ່ດັ່ງນັ້ນຄູຈະຖືກປະຕິເສດສິດ):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only database     # ແລ່ນຈາກ root ຂອງ repo
   ```
   ຫຼື copy ເນື້ອໃນ `database.rules.json` ໄປວາງໃນ Console → Realtime Database → Rules → Publish.
5. Deploy `index.html` ໃໝ່.

> ລະຫັດຜ່ານເກົ່າ (1001, 1002, ...) ໃຊ້ບໍ່ໄດ້ອີກ — ມັນຢູ່ໃນ git history ແລະ ຖານຂໍ້ມູນທີ່ເປີດໃຫ້ທຸກຄົນອ່ານມາກ່ອນ.
> Firebase ຕ້ອງການລະຫັດຜ່ານຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ.

## ວຽກປະຈຳ

- **ປ່ຽນ/ເພີ່ມການມອບໝາຍສອນ** (ຄູໃໝ່, ຫ້ອງໃໝ່, ວິຊາໃໝ່): ແກ້ `teacherAccounts` ໃນ `index.html`, ແລ້ວແລ່ນ
  `node setup-teachers.mjs` ອີກຄັ້ງ. ຖ້າບໍ່ແລ່ນ, ປຸ່ມຈະສະແດງແຕ່ Rules ຈະປະຕິເສດ (PERMISSION_DENIED).
- **ຄູລືມລະຫັດຜ່ານ**: `node setup-teachers.mjs --reset KHU07` → ລະຫັດໃໝ່ຢູ່ໃນ `initial-passwords.csv`.
- **ຄູປ່ຽນລະຫັດຜ່ານເອງ**: ປຸ່ມ "ປ່ຽນລະຫັດຜ່ານ" ໃນໜ້າຄູ (Firebase ກວດລະຫັດເກົ່າກ່ອນ).
- **ປິດບັນຊີ**: Console → Authentication → Users → Disable.
