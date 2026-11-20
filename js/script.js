const USERS_KEY = "attendance_users";
const RECORDS_KEY = "attendance_records";
const LOGS_KEY = "staff_activity_logs";
const CLASS_SETTINGS_KEY = "attendance_class_settings";
const PARENT_ALERTS_KEY = "parent_sms_alerts";

let currentUser = null;

/* SEPARATE CHART VARIABLES */

let tutorAttendanceChart = null;
let tutorFilteredAttendanceChart = null;
let studentAttendanceChart = null;

/* LOCAL STORAGE FUNCTIONS */

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getRecords() {
    return JSON.parse(localStorage.getItem(RECORDS_KEY)) || [];
}

function saveRecords(records) {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function getLogs() {
    return JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
}

function saveLogs(logs) {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

/* ACADEMIC YEAR */

function getAcademicYear(semester) {
    return Math.ceil(Number(semester) / 2);
}

/* TUTOR: SHARED CLASS SETTINGS */

function getClassSettings() {
    return JSON.parse(localStorage.getItem(CLASS_SETTINGS_KEY)) || {
        department: "",
        semester: ""
    };
}

function saveClassSettings() {
    const department = document.getElementById("newStudentDepartment").value;
    const semester = document.getElementById("newStudentSemester").value;

    localStorage.setItem(CLASS_SETTINGS_KEY, JSON.stringify({
        department: department,
        semester: semester
    }));

    const message = document.getElementById("classSettingsMessage");

    if (message) {
        message.textContent = department && semester
            ? "Class selected: " + department + " - Semester " + semester + ". These details will be used for every new student."
            : "Choose the department and semester for this class.";
    }
}

function loadClassSettings() {
    const settings = getClassSettings();
    const departmentInput = document.getElementById("newStudentDepartment");
    const semesterInput = document.getElementById("newStudentSemester");

    if (!departmentInput || !semesterInput) return;

    departmentInput.value = settings.department || "";
    semesterInput.value = settings.semester || "";

    // If this is an older installation, use the first existing student's class.
    if (!departmentInput.value || !semesterInput.value) {
        const firstStudent = getUsers().find(user => user.role === "student");

        if (firstStudent) {
            if (!departmentInput.value) {
                departmentInput.value = firstStudent.department || "";
            }
            if (!semesterInput.value) {
                semesterInput.value = String(firstStudent.semester || "");
            }
        }
    }

    saveClassSettings();
}

document.addEventListener("DOMContentLoaded", function() {
    const departmentInput = document.getElementById("newStudentDepartment");
    const semesterInput = document.getElementById("newStudentSemester");

    if (departmentInput) {
        departmentInput.addEventListener("change", saveClassSettings);
    }

    if (semesterInput) {
        semesterInput.addEventListener("change", saveClassSettings);
    }
});

/* INITIALIZE DATA */

function initializeData() {

    let users = JSON.parse(localStorage.getItem(USERS_KEY));

    if (!Array.isArray(users) || users.length === 0) {
        users = [{
            id: "ADMIN001",
            name: "System admin",
            password: "admin123",
            role: "admin"
        }];
    }

    if (!users.some(user => user.role === "admin")) {
        users.push({
            id: "ADMIN001",
            name: "System admin",
            password: "admin123",
            role: "admin"
        });
    }

    users.forEach(user => {

        if (user.role === "student") {

            if (!user.department) {
                user.department = "Not Set";
            }

            if (!user.semester) {
                user.semester = 1;
            }

            user.semester = Math.min(
                8,
                Math.max(1, Number(user.semester))
            );
        }

    });

    saveUsers(users);

    if (!localStorage.getItem(RECORDS_KEY)) {
        saveRecords([]);
    }

    if (!localStorage.getItem(LOGS_KEY)) {
        saveLogs([]);
    }
}

initializeData();
loadClassSettings();

/* LOGIN */

document.getElementById("loginForm").addEventListener("submit", function(event) {

    event.preventDefault();

    const role = document.getElementById("loginRole").value;
    const id = document.getElementById("loginId").value.trim();
    const password = document.getElementById("loginPassword").value;

    const user = getUsers().find(item =>
        String(item.id).toLowerCase() === id.toLowerCase() &&
        item.password === password &&
        item.role === role
    );

    if (!user) {
        showMessage(
            "loginMessage",
            "Invalid ID, Password or Role.",
            "red"
        );
        return;
    }

    currentUser = user;

    sessionStorage.setItem(
        "attendance_current_user",
        user.id
    );

    openPortal();
});

/* OPEN PORTAL */

function openPortal() {

    if (!currentUser) return;

    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("portalPage").classList.remove("hidden");

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + currentUser.name;

    document.querySelectorAll(".role-portal").forEach(portal => {
        portal.classList.add("hidden");
    });

    if (currentUser.role === "admin") {

        document.getElementById("adminPortal").classList.remove("hidden");

        showSection(
            "addAccountSection",
            document.querySelector("#adminPortal .navbar button")
        );

        renderAccountDetails();

    } else if (currentUser.role === "tutor") {

        document.getElementById("tutorPortal").classList.remove("hidden");

        showSection(
            "addStudentSection",
            document.querySelector("#tutorPortal .navbar button")
        );

        renderStudentDetails();
        renderStaffTracking();
        renderAllAttendance();
        renderTutorWarnings();
        loadProfile();

    } else if (currentUser.role === "staff") {

        document.getElementById("staffPortal").classList.remove("hidden");

        showSection(
            "markAttendanceSection",
            document.querySelector("#staffPortal .navbar button")
        );

        document.getElementById("attendanceDate").value = getToday();

        renderStaffStudent();
        loadProfile();

    } else if (currentUser.role === "student") {

        document.getElementById("studentPortal").classList.remove("hidden");

        showSection(
            "myAttendanceSection",
            document.querySelector("#studentPortal .navbar button")
        );

        renderStudentAttendance();
        loadStaffSubject();
        loadProfile();
    }
}

/* LOGOUT */

function logout() {

    currentUser = null;

    destroyCharts();

    sessionStorage.removeItem("attendance_current_user");

    document.getElementById("portalPage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");

    document.getElementById("loginForm").reset();
    document.getElementById("loginMessage").textContent = "";
}

/* RESTORE LOGIN */

window.addEventListener("load", function() {

    const savedId = sessionStorage.getItem("attendance_current_user");

    if (!savedId) return;

    const user = getUsers().find(item => item.id === savedId);

    if (user) {
        currentUser = user;
        openPortal();
    } else {
        sessionStorage.removeItem("attendance_current_user");
    }
});

/* SECTION NAVIGATION */

function showSection(sectionId, button) {

    if (!button) return;

    const portal = button.closest(".role-portal");

    if (!portal) return;

    portal.querySelectorAll(".content-section").forEach(section => {
        section.classList.add("hidden");
    });

    portal.querySelectorAll(".navbar button").forEach(navButton => {
        navButton.classList.remove("active");
    });

    const selectedSection = document.getElementById(sectionId);

    if (!selectedSection || !portal.contains(selectedSection)) return;

    selectedSection.classList.remove("hidden");
    button.classList.add("active");

    refreshCurrentPortal();
}

/* REFRESH PORTAL */

function refreshCurrentPortal() {

    if (!currentUser) return;

    if (currentUser.role === "admin") {

        renderAccountDetails();

    } else if (currentUser.role === "tutor") {

        renderStudentDetails();
        renderStaffTracking();
        renderAllAttendance();
        renderTutorFilteredAttendance();
        renderTutorWarnings();

    } else if (currentUser.role === "staff") {

        renderStaffStudent();

    } else if (currentUser.role === "student") {

        renderStudentAttendance();
    }
}

/* ADMIN: ADD ACCOUNT */

document.getElementById("addAccountForm").addEventListener("submit", function(event) {

    event.preventDefault();

    if (!currentUser || currentUser.role !== "admin") return;

    const role = document.getElementById("newAccountRole").value;
    const id = document.getElementById("newAccountId").value.trim();
    const name = document.getElementById("newAccountName").value.trim();
    const password = document.getElementById("newAccountPassword").value;

    if (role !== "tutor" && role !== "staff") {
        showMessage("addAccountMessage", "Select Tutor or Staff.", "red");
        return;
    }

    const users = getUsers();

    if (users.some(user => user.id.toLowerCase() === id.toLowerCase())) {
        showMessage("addAccountMessage", "Account ID already exists.", "red");
        return;
    }

    users.push({
        id,
        name,
        password,
        role
    });

    saveUsers(users);

    document.getElementById("addAccountForm").reset();

    showMessage(
        "addAccountMessage",
        "Account created successfully!",
        "green"
    );

    renderAccountDetails();
});

/* ADMIN: ACCOUNT DETAILS */

function renderAccountDetails() {

    if (!currentUser || currentUser.role !== "admin") return;

    const users = getUsers().filter(user =>
        user.role === "tutor" || user.role === "staff"
    );

    const tbody = document.getElementById("accountDetailsBody");

    tbody.innerHTML = "";

    if (users.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4">No accounts available.</td></tr>';
        return;
    }

    users.forEach(user => {

        const row = document.createElement("tr");

        addCell(row, user.id);
        addCell(row, user.name);
        addCell(row, user.role.toUpperCase());

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";
        editButton.onclick = () => editAccount(user.id);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.onclick = () => deleteAccount(user.id);

        actionCell.append(editButton, deleteButton);

        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}

/* ADMIN: EDIT ACCOUNT */

function editAccount(id) {

    if (!currentUser || currentUser.role !== "admin") return;

    const users = getUsers();
    const account = users.find(user => user.id === id);

    if (!account) return;

    const newName = prompt("Enter new name:", account.name);

    if (newName === null || !newName.trim()) return;

    const newPassword = prompt(
        "Enter new password or leave blank to keep the old password:"
    );

    if (newPassword === null) return;

    account.name = newName.trim();

    if (newPassword.trim()) {
        account.password = newPassword;
    }

    saveUsers(users);

    renderAccountDetails();
    alert("Account updated successfully!");
}

/* ADMIN: DELETE ACCOUNT */

function deleteAccount(id) {

    if (!currentUser || currentUser.role !== "admin") return;

    const account = getUsers().find(user => user.id === id);

    if (!account) return;

    if (!confirm("Delete " + account.name + "'s account?")) return;

    saveUsers(getUsers().filter(user => user.id !== id));

    if (account.role === "staff") {

        saveRecords(
            getRecords().filter(record => record.staffId !== id)
        );

        saveLogs(
            getLogs().filter(log => log.staffId !== id)
        );
    }

    renderAccountDetails();
    refreshOtherOpenPortals();

    alert("Account deleted successfully.");
}

/* TUTOR: ADD STUDENT */

document.getElementById("addStudentForm").addEventListener("submit", function(event) {

    event.preventDefault();

    if (!currentUser || currentUser.role !== "tutor") return;

    const id = document.getElementById("newStudentId").value.trim();
    const name = document.getElementById("newStudentName").value.trim();
    const parentPhone = document.getElementById("newParentNumber").value.trim();
    const parentEmail = document.getElementById("newParentEmail").value.trim();
    const department = document.getElementById("newStudentDepartment").value;
    const semester = Number(document.getElementById("newStudentSemester").value);
    const password = document.getElementById("newStudentPassword").value;

    const users = getUsers();

    if (!department) {
        showMessage("addStudentMessage", "Select the class department first.", "red");
        return;
    }

    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
        showMessage("addStudentMessage", "Select a valid class semester first.", "red");
        return;
    }

    if (!id || !name || !password) {
        showMessage("addStudentMessage", "Enter student ID, name and password.", "red");
        return;
    }

    if (users.some(user => String(user.id).toLowerCase() === id.toLowerCase())) {
        showMessage("addStudentMessage", "Student ID already exists.", "red");
        return;
    }

    users.push({
        id: id,
        name: name,
        department: department,
        semester: semester,
        parentPhone: parentPhone,
        parentEmail: parentEmail,
        password: password,
        role: "student",
        graduated: false
    });

    saveUsers(users);

    document.getElementById("newStudentId").value = "";
    document.getElementById("newStudentName").value = "";
    document.getElementById("newParentNumber").value = "";
    document.getElementById("newParentEmail").value = "";
    document.getElementById("newStudentPassword").value = "";

    showMessage(
        "addStudentMessage",
        name + " added successfully to " + department + ", Semester " + semester + ".",
        "green"
    );

    refreshOtherOpenPortals();
});

/* PARENT MESSAGES: OPEN SMS OR EMAIL */

function getParentMessage(student) {

    const records = getRecords().filter(record =>
        record.studentId === student.id
    );

    const present = records.filter(record =>
        record.status === "Present"
    ).length;

    const absent = records.filter(record =>
        record.status === "Absent"
    ).length;

    const total = present + absent;

    const percentage = total > 0
        ? ((present / total) * 100).toFixed(1)
        : "0.0";

    return "Attendance Alert: " + student.name +
        " (" + student.id + ") has " + percentage +
        "% attendance. Please contact the student and encourage regular attendance.";
}


function sendParentSMS(studentId) {

    if (!currentUser || currentUser.role !== "tutor") return;

    const student = getUsers().find(user =>
        user.id === studentId && user.role === "student"
    );

    if (!student || !student.parentPhone) {
        alert("Parent phone number is not available.");
        return;
    }

    const message = encodeURIComponent(getParentMessage(student));

    window.location.href =
        "sms:" + student.parentPhone + "?body=" + message;
}


function sendParentEmail(studentId) {

    if (!currentUser || currentUser.role !== "tutor") return;

    const student = getUsers().find(user =>
        user.id === studentId && user.role === "student"
    );

    if (!student || !student.parentEmail) {
        alert("Parent email address is not available.");
        return;
    }

    const subject = encodeURIComponent("Student Attendance Alert");
    const body = encodeURIComponent(getParentMessage(student));

    window.location.href =
        "mailto:" + student.parentEmail +
        "?subject=" + subject +
        "&body=" + body;
}

/* TUTOR: STUDENT DETAILS */

function renderStudentDetails() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const students = getUsers().filter(user => user.role === "student");
    const records = getRecords();

    const tbody = document.getElementById("studentDetailsBody");

    tbody.innerHTML = "";

    document.getElementById("tutorStudentCount").textContent =
        "Total students: " + students.length;

    const labels = [];
    const presentData = [];
    const absentData = [];

    if (students.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="10">No students available.</td></tr>';
    }

    students.forEach(student => {

        const studentRecords = records.filter(record =>
            record.studentId === student.id
        );

        const present = studentRecords.filter(record =>
            record.status === "Present"
        ).length;

        const absent = studentRecords.filter(record =>
            record.status === "Absent"
        ).length;

        const total = present + absent;

        const percentage = total > 0
            ? (present / total) * 100
            : 0;

        labels.push(student.name + " (" + student.id + ")");
        presentData.push(present);
        absentData.push(absent);

        const row = document.createElement("tr");

        addCell(row, student.id);
        addCell(row, student.name);
        addCell(row, student.department || "Not Set");
        addCell(row, "Semester " + student.semester);

        addCell(
            row,
            student.graduated
                ? "Graduated"
                : "Year " + getAcademicYear(student.semester)
        );

        addCell(row, present);
        addCell(row, absent);
        addCell(row, percentage.toFixed(1) + "%");

        const warningCell = document.createElement("td");

        if (total === 0) {

            warningCell.textContent = "No Records";

        } else if (percentage < 60) {

            warningCell.className = "warning-cell";

            const warningText = document.createElement("div");
            warningText.textContent = "Low Attendance";
            warningText.className = "low-attendance-title";

            warningCell.appendChild(warningText);

            const messageButtons = document.createElement("div");
            messageButtons.className = "parent-message-buttons";

            if (student.parentPhone) {

                const smsButton = document.createElement("button");

                smsButton.type = "button";
                smsButton.textContent = "Send SMS";
                smsButton.className = "parent-message-btn";
                smsButton.onclick = () => sendParentSMS(student.id);

                messageButtons.appendChild(smsButton);
            }

            if (student.parentEmail) {

                const emailButton = document.createElement("button");

                emailButton.type = "button";
                emailButton.textContent = "Send Email";
                emailButton.className = "parent-message-btn";
                emailButton.onclick = () => sendParentEmail(student.id);

                messageButtons.appendChild(emailButton);
            }

            if (!student.parentPhone && !student.parentEmail) {

                const contactText = document.createElement("small");

                contactText.textContent = "Parent contact details not added";
                contactText.className = "parent-contact-missing";

                warningCell.appendChild(contactText);

            } else {

                warningCell.appendChild(messageButtons);
            }

        } else {

            warningCell.textContent = "Good";
            warningCell.className = "safe-cell";
        }

        row.appendChild(warningCell);

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";
        editButton.onclick = () => editStudent(student.id);

        actionCell.appendChild(editButton);

        if (!student.graduated) {

            const completeButton = document.createElement("button");
            completeButton.textContent = "Complete Semester";
            completeButton.className = "complete-btn";
            completeButton.onclick = () => completeStudentSemester(student.id);

            actionCell.appendChild(completeButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.onclick = () => deleteStudent(student.id);

        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);
        tbody.appendChild(row);
    });

    updateTutorChart(labels, presentData, absentData);
}


/* TUTOR: WARNING TAB */

/* GET STUDENTS BELOW 60% ATTENDANCE */

function getTutorWarningStudents() {

    const students = getUsers().filter(user =>
        user.role === "student"
    );

    const records = getRecords();

    return students.map(student => {

        const studentRecords = records.filter(record =>
            record.studentId === student.id
        );

        const present = studentRecords.filter(record =>
            record.status === "Present"
        ).length;

        const absent = studentRecords.filter(record =>
            record.status === "Absent"
        ).length;

        const total = present + absent;

        const percentage = total > 0
            ? (present / total) * 100
            : 0;

        return {
            ...student,
            present,
            absent,
            total,
            percentage
        };

    }).filter(student =>
        student.total > 0 && student.percentage < 60
    );
}


/* DISPLAY WARNING STUDENTS */

function renderTutorWarnings() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const students = getTutorWarningStudents();

    const tbody = document.getElementById("tutorWarningBody");

    const count = document.getElementById("warningStudentCount");

    if (!tbody || !count) return;

    tbody.innerHTML = "";

    count.textContent = students.length;

    if (students.length === 0) {

        tbody.innerHTML =
            '<tr><td colspan="6">No students below 60% attendance.</td></tr>';

        return;
    }

    students.forEach(student => {

        const row = document.createElement("tr");

        addCell(row, student.id);
        addCell(row, student.name);

        const percentageCell = document.createElement("td");

        percentageCell.textContent =
            student.percentage.toFixed(1) + "%";

        percentageCell.className = "warning-cell";

        row.appendChild(percentageCell);

        addCell(row, student.parentPhone || "Not Available");

        addCell(row, student.parentEmail || "Not Available");

        const actionCell = document.createElement("td");

        // INDIVIDUAL SMS

        if (student.parentPhone) {

            const smsButton = document.createElement("button");

            smsButton.type = "button";
            smsButton.textContent = "Send SMS";
            smsButton.className = "parent-message-btn";

            smsButton.onclick = () =>
                sendParentSMS(student.id);

            actionCell.appendChild(smsButton);
        }

        // INDIVIDUAL EMAIL

        if (student.parentEmail) {

            const emailButton = document.createElement("button");

            emailButton.type = "button";
            emailButton.textContent = "Send Email";
            emailButton.className = "parent-message-btn";

            emailButton.onclick = () =>
                sendParentEmail(student.id);

            actionCell.appendChild(emailButton);
        }

        if (!student.parentPhone && !student.parentEmail) {

            actionCell.textContent = "No Parent Contact";
        }

        row.appendChild(actionCell);

        tbody.appendChild(row);

    });
}


/* SEND SMS TO ALL PARENTS */

function sendSMSAllParents() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const students = getTutorWarningStudents();

    const eligibleStudents = students.filter(student =>
        student.parentPhone
    );

    if (eligibleStudents.length === 0) {

        showMessage(
            "bulkWarningMessage",
            "No parent phone numbers available.",
            "red"
        );

        return;
    }

    const confirmed = confirm(
        "Open SMS for parents of " +
        eligibleStudents.length +
        " students below 60% attendance?"
    );

    if (!confirmed) return;

    const phoneNumbers = eligibleStudents.map(student =>
        student.parentPhone
    );

    const message = encodeURIComponent(
        "Attendance Alert: Your child has less than 60% attendance. " +
        "Please contact the college and encourage regular attendance."
    );

    // Multiple recipients in one SMS compose request.
    // Support depends on the device and messaging application.

    window.location.href =
        "sms:" + phoneNumbers.join(",") +
        "?body=" + message;

    showMessage(
        "bulkWarningMessage",
        "SMS compose request opened. Please review and send the messages.",
        "green"
    );
}


/* SEND EMAIL TO ALL PARENTS */

function sendEmailAllParents() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const students = getTutorWarningStudents();

    const eligibleStudents = students.filter(student =>
        student.parentEmail
    );

    if (eligibleStudents.length === 0) {

        showMessage(
            "bulkWarningMessage",
            "No parent email addresses available.",
            "red"
        );

        return;
    }

    const confirmed = confirm(
        "Open an email for parents of " +
        eligibleStudents.length +
        " students below 60% attendance?"
    );

    if (!confirmed) return;

    const emailAddresses = eligibleStudents.map(student =>
        student.parentEmail
    );

    const subject = encodeURIComponent(
        "Student Attendance Warning - Below 60%"
    );

    const body = encodeURIComponent(
        "Dear Parent,\n\n" +
        "Your child currently has attendance below 60%.\n\n" +
        "We request you to contact the college and encourage " +
        "your child to maintain regular attendance.\n\n" +
        "Thank you,\n" +
        "Class Tutor"
    );

    // BCC keeps parents' email addresses private.

    window.location.href =
        "mailto:?bcc=" +
        encodeURIComponent(emailAddresses.join(",")) +
        "&subject=" + subject +
        "&body=" + body;

    showMessage(
        "bulkWarningMessage",
        "Email compose request opened. Please review and send the email.",
        "green"
    );
}


/* TUTOR: EDIT STUDENT */

function editStudent(id) {

    if (!currentUser || currentUser.role !== "tutor") return;

    const users = getUsers();
    const student = users.find(user => user.id === id);

    if (!student) return;

    const name = prompt("Enter student name:", student.name);

    if (name === null || !name.trim()) return;

    student.name = name.trim();

    // Department and semester are shared class settings.
    // They are not edited separately for an individual student.

    saveUsers(users);
    refreshOtherOpenPortals();

    alert("Student name updated successfully. Department and semester remain the same as the class details.");
}

/* TUTOR: COMPLETE SEMESTER */

function completeStudentSemester(id) {

    if (!currentUser || currentUser.role !== "tutor") return;

    const users = getUsers();
    const student = users.find(user => user.id === id);

    if (!student || student.graduated) return;

    const semester = Number(student.semester);

    if (semester < 8) {

        const nextSemester = semester + 1;

        if (!confirm(
            "Complete Semester " + semester + " for " +
            student.name + "?\n\n" +
            "Next Semester: " + nextSemester + "\n" +
            "Next Year: " + getAcademicYear(nextSemester)
        )) return;

        student.semester = nextSemester;

        saveUsers(users);
        refreshOtherOpenPortals();

        alert(
            "Semester completed successfully!\n" +
            "Student is now in Semester " + nextSemester +
            ", Year " + getAcademicYear(nextSemester)
        );

    } else {

        if (!confirm(
            "Semester 8 completed. Mark this student as Graduated?"
        )) return;

        student.graduated = true;

        saveUsers(users);
        refreshOtherOpenPortals();

        alert("Student marked as Graduated.");
    }
}

/* TUTOR: DELETE STUDENT */

function deleteStudent(id) {

    if (!currentUser || currentUser.role !== "tutor") return;

    const student = getUsers().find(user => user.id === id);

    if (!student) return;

    if (!confirm(
        "Delete " + student.name +
        " and all related attendance records?"
    )) return;

    const oldRecords = getRecords();

    const studentRecords = oldRecords.filter(record =>
        record.studentId === id
    );

    saveUsers(getUsers().filter(user => user.id !== id));

    saveRecords(oldRecords.filter(record =>
        record.studentId !== id
    ));

    const updatedLogs = getLogs().map(log => {

        if (Array.isArray(log.studentIds)) {

            const remaining = log.studentIds.filter(studentId =>
                studentId !== id
            );

            return {
                ...log,
                studentIds: remaining,
                studentsMarked: remaining.length
            };
        }

        const matching = studentRecords.some(record =>
            record.staffId === log.staffId &&
            record.date === log.date &&
            String(record.period) === String(log.period) &&
            String(record.subject).toLowerCase() ===
            String(log.subject).toLowerCase()
        );

        if (matching) {
            return {
                ...log,
                studentsMarked: Math.max(
                    0,
                    Number(log.studentsMarked || 0) - 1
                )
            };
        }

        return log;

    }).filter(log => Number(log.studentsMarked) > 0);

    saveLogs(updatedLogs);

    refreshOtherOpenPortals();

    alert("Student and related records deleted successfully.");
}

/* TUTOR: ORIGINAL STUDENT CHART */

function updateTutorChart(labels, presentData, absentData) {

    const canvas = document.getElementById("tutorAttendanceChart");

    if (!canvas || typeof Chart === "undefined") return;

    if (tutorAttendanceChart) {
        tutorAttendanceChart.destroy();
    }

    // Calculate total present and absent
    const totalPresent = presentData.reduce(
        (sum, value) => sum + value, 0
    );

    const totalAbsent = absentData.reduce(
        (sum, value) => sum + value, 0
    );

    tutorAttendanceChart = new Chart(canvas, {

        type: "doughnut",

        data: {
            labels: ["Present", "Absent"],

            datasets: [{
                data: [totalPresent, totalAbsent],
                backgroundColor: ["#36a879", "#e76b6b"],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom"
                },

                title: {
                    display: true,
                    text: "Overall Student Attendance"
                }
            }
        }
    });
}
/* TUTOR: APPLY ATTENDANCE FILTERS */

function applyTutorAttendanceFilters() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const fromDate = document.getElementById(
        "tutorFilterFromDate"
    ).value;

    const toDate = document.getElementById(
        "tutorFilterToDate"
    ).value;

    if (fromDate && toDate && fromDate > toDate) {
        alert("From Date cannot be later than To Date.");
        return;
    }

    renderTutorFilteredAttendance();
}

/* TUTOR: CLEAR ATTENDANCE FILTERS */

function clearTutorAttendanceFilters() {

    document.getElementById("tutorFilterStudentId").value = "";
    document.getElementById("tutorFilterFromDate").value = "";
    document.getElementById("tutorFilterToDate").value = "";
    document.getElementById("tutorFilterStaff").value = "";
    document.getElementById("tutorFilterPeriod").value = "";
    document.getElementById("tutorFilterSubject").value = "";

    renderTutorFilteredAttendance();
}

/* TUTOR: FILTERED ATTENDANCE CHART AND TABLE */

function renderTutorFilteredAttendance() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const studentInput = document.getElementById("tutorFilterStudentId");
    const fromInput = document.getElementById("tutorFilterFromDate");
    const toInput = document.getElementById("tutorFilterToDate");
    const staffInput = document.getElementById("tutorFilterStaff");
    const periodInput = document.getElementById("tutorFilterPeriod");
    const subjectInput = document.getElementById("tutorFilterSubject");

    const canvas = document.getElementById(
        "tutorFilteredAttendanceChart"
    );

    if (!studentInput || !canvas) return;

    const studentId = studentInput.value.trim().toLowerCase();
    const fromDate = fromInput.value;
    const toDate = toInput.value;
    const staffName = staffInput.value.trim().toLowerCase();
    const period = periodInput.value;
    const subject = subjectInput.value.trim().toLowerCase();

    const records = getRecords();

    const filtered = records.filter(record => {

        if (
            studentId &&
            !String(record.studentId).toLowerCase().includes(studentId)
        ) {
            return false;
        }

        if (fromDate && record.date < fromDate) return false;

        if (toDate && record.date > toDate) return false;

        if (
            staffName &&
            !String(record.staffName || "").toLowerCase().includes(staffName)
        ) {
            return false;
        }

        if (
            period &&
            String(record.period) !== period
        ) {
            return false;
        }

        if (
            subject &&
            !String(record.subject || "").toLowerCase().includes(subject)
        ) {
            return false;
        }

        return true;
    });

    const present = filtered.filter(record =>
        record.status === "Present"
    ).length;

    const absent = filtered.filter(record =>
        record.status === "Absent"
    ).length;

    /* SUMMARY */

    document.getElementById("tutorFilterResult").textContent =
        "Matching Records: " + filtered.length;

    document.getElementById("tutorFilterCounts").textContent =
        "Present: " + present + " | Absent: " + absent;

    /* GROUP RECORDS BY STUDENT */

    const summary = {};

    filtered.forEach(record => {

        const id = record.studentId;

        if (!summary[id]) {
            summary[id] = {
                name: record.studentName,
                present: 0,
                absent: 0
            };
        }

        if (record.status === "Present") {
            summary[id].present++;
        } else if (record.status === "Absent") {
            summary[id].absent++;
        }
    });

    const labels = [];
    const presentData = [];
    const absentData = [];

    Object.keys(summary).forEach(id => {

        labels.push(summary[id].name + " (" + id + ")");
        presentData.push(summary[id].present);
        absentData.push(summary[id].absent);

    });

    /* FILTERED RECORD TABLE */

    const tbody = document.getElementById(
        "tutorFilteredAttendanceBody"
    );

    tbody.innerHTML = "";

    if (filtered.length === 0) {

        tbody.innerHTML =
            '<tr><td colspan="7">No matching attendance records found.</td></tr>';

    } else {

        filtered.sort((a, b) =>
            b.date.localeCompare(a.date)
        );

        filtered.forEach(record => {

            const row = document.createElement("tr");

            addCell(row, record.studentId);
            addCell(row, record.studentName);
            addCell(row, record.date);
            addCell(row, "Period " + record.period);
            addCell(row, record.subject);

            const statusCell = document.createElement("td");

            statusCell.textContent = record.status;

            statusCell.className =
                record.status === "Present"
                    ? "status-present"
                    : "status-absent";

            row.appendChild(statusCell);

            addCell(row, record.staffName);

            tbody.appendChild(row);
        });
    }

    /* FILTERED CHART */

    if (typeof Chart === "undefined") return;

    if (tutorFilteredAttendanceChart) {
        tutorFilteredAttendanceChart.destroy();
        tutorFilteredAttendanceChart = null;
    }

    tutorFilteredAttendanceChart = new Chart(canvas, {

        type: "bar",

        data: {
            labels: labels,

            datasets: [
                {
                    label: "Present",
                    data: presentData,
                    backgroundColor: "#36a879"
                },
                {
                    label: "Absent",
                    data: absentData,
                    backgroundColor: "#e76b6b"
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: "Number of periods"
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: "Students"
                    }
                }
            },

            plugins: {
                legend: {
                    position: "top"
                },

                title: {
                    display: true,
                    text: "Filtered Attendance Summary"
                }
            }
        }
    });
}

/* STAFF: STUDENT LIST */

function renderStaffStudent() {

    if (!currentUser || currentUser.role !== "staff") return;

    const students = getUsers().filter(user =>
        user.role === "student" && !user.graduated
    );

    const tbody = document.getElementById("staffStudentBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (students.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="3">No active students available.</td></tr>';
        return;
    }

    const dateInput = document.getElementById("attendanceDate");
    const periodInput = document.getElementById("attendancePeriod");

    const selectedDate = dateInput ? dateInput.value : getToday();
    const selectedPeriod = periodInput ? periodInput.value : "";

    const subject = currentUser.subject || "";

    const records = getRecords();

    students.forEach(student => {

        const row = document.createElement("tr");

        addCell(row, student.id);
        addCell(row, student.name);

        const statusCell = document.createElement("td");

        const select = document.createElement("select");

        select.className = "student-attendance";
        select.dataset.studentId = student.id;

        select.innerHTML =
            '<option value="Present">Present</option>' +
            '<option value="Absent">Absent</option>';

        // Find attendance saved for this exact date, period,
        // staff member and subject.

        const savedRecord = records.find(record =>
            record.studentId === student.id &&
            record.date === selectedDate &&
            String(record.period) === String(selectedPeriod) &&
            record.staffId === currentUser.id &&
            String(record.subject || "").toLowerCase() ===
            String(subject).toLowerCase()
        );

        if (savedRecord) {
            select.value = savedRecord.status;
        } else {
            select.value = "Present";
        }

        statusCell.appendChild(select);
        row.appendChild(statusCell);

        tbody.appendChild(row);
    });
}
/* STAFF: LOAD SAVED SUBJECT */

function loadStaffSubject() {

    if (!currentUser || currentUser.role !== "staff") return;

    const subjectInput = document.getElementById("attendanceSubject");

    subjectInput.value = currentUser.subject || "";
    subjectInput.readOnly = true;

    document.getElementById("editSubjectButton").style.display = "inline-block";
    document.getElementById("saveSubjectButton").style.display = "none";
    document.getElementById("cancelSubjectButton").style.display = "none";

    document.getElementById("staffSubjectMessage").textContent =
        currentUser.subject ? "Saved subject loaded." : "Please enter your subject.";
}


/* STAFF: EDIT SUBJECT */

function editStaffSubject() {

    if (!currentUser || currentUser.role !== "staff") return;

    const subjectInput = document.getElementById("attendanceSubject");

    subjectInput.readOnly = false;
    subjectInput.focus();

    document.getElementById("editSubjectButton").style.display = "none";
    document.getElementById("saveSubjectButton").style.display = "inline-block";
    document.getElementById("cancelSubjectButton").style.display = "inline-block";

    document.getElementById("staffSubjectMessage").textContent =
        "Edit your subject and click Save Subject.";
}


/* STAFF: CANCEL SUBJECT EDIT */

function cancelStaffSubjectEdit() {

    if (!currentUser || currentUser.role !== "staff") return;

    loadStaffSubject();
}


/* STAFF: SAVE SUBJECT */

function saveStaffSubject() {

    if (!currentUser || currentUser.role !== "staff") return;

    const subject = document.getElementById("attendanceSubject").value.trim();

    if (!subject) {
        document.getElementById("staffSubjectMessage").textContent =
            "Please enter a subject.";

        return;
    }

    const users = getUsers();

    const index = users.findIndex(user =>
        user.id === currentUser.id && user.role === "staff"
    );

    if (index === -1) {
        alert("Staff account not found.");
        return;
    }

    users[index].subject = subject;

    saveUsers(users);

    currentUser = users[index];

    loadStaffSubject();

    document.getElementById("staffSubjectMessage").textContent =
        "Subject saved successfully!";
}

/* STAFF: SAVE ATTENDANCE */

function saveAttendance() {

    if (!currentUser || currentUser.role !== "staff") return;

    const date = document.getElementById("attendanceDate").value;
    const period = document.getElementById("attendancePeriod").value;
    const subject = currentUser.subject || "";

    if (!date || !period || !subject) {

        showMessage(
            "attendanceMessage",
            "Enter date, period and subject.",
            "red"
        );

        return;
    }

    const students = getUsers().filter(user =>
        user.role === "student" && !user.graduated
    );

    if (students.length === 0) {

        showMessage(
            "attendanceMessage",
            "No active students available.",
            "red"
        );

        return;
    }

    const selects = document.querySelectorAll(".student-attendance");

    let records = getRecords();

    const now = new Date();

    const time = now.toLocaleTimeString();
    const markedAt = now.toISOString();

    const markedStudentIds = [];

    selects.forEach(select => {

        const studentId = select.dataset.studentId;

        const student = students.find(item =>
            item.id === studentId
        );

        if (!student) return;

        const newRecord = {

            studentId: student.id,
            studentName: student.name,
            date: date,
            period: period,
            subject: subject,
            status: select.value,
            staffId: currentUser.id,
            staffName: currentUser.name,
            time: time,
            markedAt: markedAt

        };

        // Match the complete attendance identity.
        // This prevents one staff member's attendance from
        // overwriting another staff member's records.

        const existingIndex = records.findIndex(record =>
            record.studentId === student.id &&
            record.date === date &&
            String(record.period) === String(period) &&
            record.staffId === currentUser.id &&
            String(record.subject || "").toLowerCase() ===
            String(subject).toLowerCase()
        );

        if (existingIndex !== -1) {

            records[existingIndex] = newRecord;

        } else {

            records.push(newRecord);

        }

        markedStudentIds.push(student.id);

    });

    saveRecords(records);

    /* STAFF ACTIVITY LOG */

    const logs = getLogs();

    // Find an existing log for this same attendance session.

    const existingLogIndex = logs.findIndex(log =>
        log.staffId === currentUser.id &&
        log.date === date &&
        String(log.period) === String(period) &&
        String(log.subject || "").toLowerCase() ===
        String(subject).toLowerCase()
    );

    const newLog = {

        staffId: currentUser.id,
        staffName: currentUser.name,
        date: date,
        time: time,
        markedAt: markedAt,
        period: period,
        subject: subject,
        studentsMarked: markedStudentIds.length,
        studentIds: markedStudentIds

    };

    // Update an existing log instead of creating duplicates.

    if (existingLogIndex !== -1) {

        logs[existingLogIndex] = newLog;

    } else {

        logs.push(newLog);

    }

    saveLogs(logs);

    // Refresh the table using the saved records.

    renderStaffStudent();

    showMessage(
        "attendanceMessage",
        "Attendance saved successfully!",
        "green"
    );

    refreshOtherOpenPortals();
}
/* TUTOR: STAFF TRACKING */

function renderStaffTracking() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const logs = [...getLogs()].reverse();

    const tbody = document.getElementById("staffTrackingBody");

    tbody.innerHTML = "";

    if (logs.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="7">No staff activity available.</td></tr>';
        return;
    }

    logs.forEach(log => {

        const row = document.createElement("tr");

        addCell(row, log.staffId);
        addCell(row, log.staffName);
        addCell(row, log.date);
        addCell(row, log.time);
        addCell(row, "Period " + log.period);
        addCell(row, log.subject);
        addCell(row, log.studentsMarked);

        tbody.appendChild(row);
    });
}

/* TUTOR: ALL ATTENDANCE RECORDS */

function renderAllAttendance() {

    if (!currentUser || currentUser.role !== "tutor") return;

    const records = [...getRecords()].reverse();

    const tbody = document.getElementById("allAttendanceBody");

    tbody.innerHTML = "";

    if (records.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="8">No attendance records available.</td></tr>';
        return;
    }

    records.forEach(record => {

        const row = document.createElement("tr");

        addCell(row, record.studentId);
        addCell(row, record.studentName);
        addCell(row, record.date);
        addCell(row, "Period " + record.period);
        addCell(row, record.subject);

        const statusCell = document.createElement("td");

        statusCell.textContent = record.status;

        statusCell.className =
            record.status === "Present"
                ? "status-present"
                : "status-absent";

        row.appendChild(statusCell);

        addCell(row, record.staffName);
        addCell(row, record.time);

        tbody.appendChild(row);
    });
}

/* STUDENT: ATTENDANCE */

function renderStudentAttendance() {

    if (!currentUser || currentUser.role !== "student") return;

    const records = getRecords().filter(record =>
        record.studentId === currentUser.id
    );

    const present = records.filter(record =>
        record.status === "Present"
    ).length;

    const absent = records.filter(record =>
        record.status === "Absent"
    ).length;

    const total = present + absent;

    const percentage = total > 0
        ? (present / total) * 100
        : 0;

    updateStudentChart(present, absent);

    showStudentWarning(percentage, total);

    const fromDate = document.getElementById("studentFromDate").value;
    const toDate = document.getElementById("studentToDate").value;
    const period = document.getElementById("studentPeriodFilter").value;

    const subject = document.getElementById("studentSubjectFilter")
        .value.trim().toLowerCase();

    const filtered = records.filter(record => {

        if (fromDate && record.date < fromDate) return false;

        if (toDate && record.date > toDate) return false;

        if (period && String(record.period) !== period) return false;

        if (
            subject &&
            !String(record.subject).toLowerCase().includes(subject)
        ) {
            return false;
        }

        return true;
    });

    const tbody = document.getElementById("myAttendanceBody");

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="6">No attendance records found.</td></tr>';
        return;
    }

    filtered.sort((a, b) =>
        b.date.localeCompare(a.date)
    );

    filtered.forEach(record => {

        const row = document.createElement("tr");

        addCell(row, record.date);
        addCell(row, "Period " + record.period);
        addCell(row, record.subject);

        const statusCell = document.createElement("td");

        statusCell.textContent = record.status;

        statusCell.className =
            record.status === "Present"
                ? "status-present"
                : "status-absent";

        row.appendChild(statusCell);

        addCell(row, record.staffName);
        addCell(row, record.time);

        tbody.appendChild(row);
    });
}

/* STUDENT: ATTENDANCE WARNING */

function showStudentWarning(percentage, total) {

    const warning = document.getElementById(
        "studentAttendanceWarning"
    );

    if (!warning) return;

    if (total > 0 && percentage < 75) {

        warning.classList.remove("hidden");

        warning.textContent =
            "Warning: Your attendance is " +
            percentage.toFixed(1) +
            "%. It is below 75%. Please improve your attendance.";

        sendAttendanceNotification(percentage);

    } else {

        warning.classList.add("hidden");

        if (currentUser) {
            sessionStorage.removeItem(
                "attendance_notification_" + currentUser.id
            );
        }
    }
}

/* STUDENT: CHART */

function updateStudentChart(present, absent) {

    const canvas = document.getElementById("studentAttendanceChart");

    const message = document.getElementById("studentChartMessage");

    if (!canvas || typeof Chart === "undefined") return;

    const total = present + absent;

    const percentage = total > 0
        ? ((present / total) * 100).toFixed(1)
        : 0;

    message.textContent = total > 0
        ? "Present: " + present +
          " | Absent: " + absent +
          " | Attendance: " + percentage + "%"
        : "No attendance data available.";

    if (studentAttendanceChart) {
        studentAttendanceChart.destroy();
    }

    studentAttendanceChart = new Chart(canvas, {

        type: "doughnut",

        data: {
            labels: ["Present", "Absent"],

            datasets: [{
                data: total > 0 ? [present, absent] : [0, 0],
                backgroundColor: ["#36a879", "#e76b6b"]
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

/* STUDENT: CLEAR FILTERS */

function clearStudentFilters() {

    document.getElementById("studentFromDate").value = "";
    document.getElementById("studentToDate").value = "";
    document.getElementById("studentPeriodFilter").value = "";
    document.getElementById("studentSubjectFilter").value = "";

    renderStudentAttendance();
}

/* STUDENT: NOTIFICATIONS */

function enableStudentNotifications() {

    if (!currentUser || currentUser.role !== "student") return;

    if (!("Notification" in window)) {

        showMessage(
            "notificationMessage",
            "Browser notifications are not supported.",
            "red"
        );

        return;
    }

    Notification.requestPermission().then(permission => {

        if (permission === "granted") {

            showMessage(
                "notificationMessage",
                "Notifications enabled successfully!",
                "green"
            );

            renderStudentAttendance();

        } else {

            showMessage(
                "notificationMessage",
                "Notification permission not granted.",
                "red"
            );
        }
    });
}

/* STUDENT: SEND NOTIFICATION */

function sendAttendanceNotification(percentage) {

    if (!currentUser) return;

    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") return;

    const key = "attendance_notification_" + currentUser.id;

    if (sessionStorage.getItem(key)) return;

    new Notification("Attendance Warning", {

        body:
            "Your attendance is " +
            percentage.toFixed(1) +
            "%. It is below 75%."

    });

    sessionStorage.setItem(key, "shown");
}

/* LOAD PROFILE */

function loadProfile() {

    if (!currentUser) return;

    if (currentUser.role === "tutor") {

        document.getElementById("tutorProfileName").value =
            currentUser.name;

    } else if (currentUser.role === "staff") {

        document.getElementById("staffProfileID").value =
            currentUser.id;

        document.getElementById("staffProfileName").value =
            currentUser.name;

        loadStaffSubject();

    } else if (currentUser.role === "student") {

        document.getElementById("studentProfileId").value =
            currentUser.id;

        document.getElementById("studentProfileName").value =
            currentUser.name;
    }
}

/* PROFILE MESSAGE */

function getProfileMessageId() {

    if (!currentUser) return "profileMessage";

    if (currentUser.role === "staff") {
        return "staffProfileMessage";
    }

    if (currentUser.role === "student") {
        return "studentProfileMessage";
    }

    return "profileMessage";
}

/* UPDATE PROFILE */

function updateProfile() {

    if (!currentUser) return;

    if (currentUser.role === "admin") {
        alert("Admin profile editing is not available.");
        return;
    }

    let nameInput;
    let passwordInput;
    let confirmInput;

    if (currentUser.role === "tutor") {

        nameInput = document.getElementById("tutorProfileName");
        passwordInput = document.getElementById("tutorNewPassword");
        confirmInput = document.getElementById("tutorConfirmPassword");

    } else if (currentUser.role === "staff") {

        nameInput = document.getElementById("staffProfileName");
        passwordInput = document.getElementById("staffNewPassword");
        confirmInput = document.getElementById("staffConfirmPassword");

    } else if (currentUser.role === "student") {

        nameInput = document.getElementById("studentProfileName");
        passwordInput = document.getElementById("studentNewPassword");
        confirmInput = document.getElementById("studentConfirmPassword");
    }

    const name = nameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    const messageId = getProfileMessageId();

    if (!name) {
        showMessage(messageId, "Name cannot be empty.", "red");
        return;
    }

    if (password || confirmPassword) {

        if (!password || !confirmPassword) {
            showMessage(
                messageId,
                "Enter and confirm your password.",
                "red"
            );
            return;
        }

        if (password !== confirmPassword) {
            showMessage(
                messageId,
                "Passwords do not match.",
                "red"
            );
            return;
        }
    }

    const users = getUsers();

    const index = users.findIndex(user =>
        user.id === currentUser.id
    );

    if (index === -1) return;

    users[index].name = name;

    if (password) {
        users[index].password = password;
    }

    saveUsers(users);

    currentUser = users[index];

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + currentUser.name;

    passwordInput.value = "";
    confirmInput.value = "";

    showMessage(
        messageId,
        "Profile updated successfully!",
        "green"
    );

    refreshCurrentPortal();
    loadProfile();
}

/* REFRESH OTHER OPEN PORTALS */

function refreshOtherOpenPortals() {

    refreshCurrentPortal();

    localStorage.setItem(
        "attendance_refresh_signal",
        Date.now().toString()
    );
}

/* STORAGE EVENT */

window.addEventListener("storage", function(event) {

    if (
        event.key === USERS_KEY ||
        event.key === RECORDS_KEY ||
        event.key === LOGS_KEY ||
        event.key === "attendance_refresh_signal"
    ) {

        if (!currentUser) return;

        const updatedUser = getUsers().find(user =>
            user.id === currentUser.id
        );

        if (!updatedUser) {

            alert("Your account is no longer available.");

            logout();

            return;
        }

        currentUser = updatedUser;

        document.getElementById("welcomeMessage").textContent =
            "Welcome, " + currentUser.name;

        loadProfile();
        refreshCurrentPortal();
    }
});

/* DESTROY CHARTS */

function destroyCharts() {

    if (tutorAttendanceChart) {
        tutorAttendanceChart.destroy();
        tutorAttendanceChart = null;
    }

    if (tutorFilteredAttendanceChart) {
        tutorFilteredAttendanceChart.destroy();
        tutorFilteredAttendanceChart = null;
    }

    if (studentAttendanceChart) {
        studentAttendanceChart.destroy();
        studentAttendanceChart = null;
    }
}

/* COMMON TABLE FUNCTION */

function addCell(row, value) {

    const cell = document.createElement("td");

    cell.textContent = value ?? "";

    row.appendChild(cell);
}

/* MESSAGE FUNCTION */

function showMessage(elementId, message, color) {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.style.color = color;
}

/* GET TODAY */

function getToday() {

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}


/* STAFF: REFRESH ATTENDANCE WHEN DATE OR PERIOD CHANGES */

document.addEventListener("DOMContentLoaded", function() {

    const dateInput = document.getElementById("attendanceDate");
    const periodInput = document.getElementById("attendancePeriod");

    if (dateInput) {
        dateInput.addEventListener("change", function() {
            renderStaffStudent();
        });
    }

    if (periodInput) {
        periodInput.addEventListener("change", function() {
            renderStaffStudent();
        });
    }

});

// Make functions available to HTML onclick events


window.showSection = showSection;
window.logout = logout;

// Make HTML onclick functions accessible globally

// Navigation and login
window.showSection = showSection;
window.logout = logout;

// JSON export
window.exportUsersToJSON = exportUsersToJSON;
window.exportAttendanceToJSON = exportAttendanceToJSON;

// Tutor attendance analysis
window.applyTutorAttendanceFilters = applyTutorAttendanceFilters;
window.clearTutorAttendanceFilters = clearTutorAttendanceFilters;

// Parent communication
window.sendSMSAllParents = sendSMSAllParents;
window.sendEmailAllParents = sendEmailAllParents;

// Profile management
window.updateProfile = updateProfile;

// Staff subject management
window.editStaffSubject = editStaffSubject;
window.saveStaffSubject = saveStaffSubject;
window.cancelStaffSubjectEdit = cancelStaffSubjectEdit;

// Staff attendance
window.saveAttendance = saveAttendance;

// Student attendance filters
window.renderStudentAttendance = renderStudentAttendance;
window.clearStudentFilters = clearStudentFilters;




function exportUsersToJSON() {
    const users = getUsers();

    // Exclude password-related fields
    const safeUsers = users.map(user => {
        return Object.fromEntries(
            Object.entries(user).filter(([key]) =>
                !key.toLowerCase().includes("password")
            )
        );
    });

    const jsonData = JSON.stringify(
        { users: safeUsers },
        null,
        4
    );

    const blob = new Blob([jsonData], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "users.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    alert("Users data exported successfully!");
}

window.exportUsersToJSON = exportUsersToJSON;



function exportAttendanceToJSON() {
    const attendance = getRecords();

    const jsonData = JSON.stringify(
        { attendance: attendance },
        null,
        4
    );

    const blob = new Blob([jsonData], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance.json";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert("Attendance data exported successfully!");
}

window.exportAttendanceToJSON = exportAttendanceToJSON;


async function importUsersFromJSON(event) {
    const file = event.target.files[0];

    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.users || !Array.isArray(data.users)) {
            throw new Error("Invalid users JSON format");
        }

        if (!confirm("Import users? This will replace the existing user list.")) {
            return;
        }

        // Preserve passwords for matching accounts on this laptop
        const existingUsers = getUsers();

        const importedUsers = data.users.map(user => {
            const existingUser = existingUsers.find(
                oldUser => oldUser.id === user.id
            );

            return existingUser
                ? { ...user, password: existingUser.password }
                : user;
        });

        saveUsers(importedUsers);

        alert("Users imported successfully!");

    } catch (error) {
        alert("Error importing users: " + error.message);
    }

    event.target.value = "";
}


async function importAttendanceFromJSON(event) {
    const file = event.target.files[0];

    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.attendance || !Array.isArray(data.attendance)) {
            throw new Error("Invalid attendance JSON format");
        }

        if (!confirm("Import attendance? This will replace existing attendance records.")) {
            return;
        }

        saveRecords(data.attendance);

        alert("Attendance imported successfully!");

    } catch (error) {
        alert("Error importing attendance: " + error.message);
    }

    event.target.value = "";
}


// Make import functions accessible to HTML
window.importUsersFromJSON = importUsersFromJSON;
window.importAttendanceFromJSON = importAttendanceFromJSON;
