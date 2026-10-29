// Fake sample data in BIDV format.
// Email: given name + initials of family and middle names, no diacritics, @bidv.com.vn
//   (e.g. Nguyễn Bình An -> annb@bidv.com.vn).
// Replace with an API call when a backend is available.
// `photo` is optional, e.g. "images/xxx.jpg" — falls back to the BIDV emblem.
const EMPLOYEES = [
  {
    id: "BIDV10231",
    fullName: "Nguyễn Bình An",
    title: "Chuyên viên cấp 3",
    phone: "+84915273846",
    email: "annb@bidv.com.vn",
    department: "Trung tâm Phát triển phần mềm",
    photo: null,
  },
];
