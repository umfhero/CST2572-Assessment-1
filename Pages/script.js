//1055801944
//1985NORVILL@aeriell
// ask which lines are encryption and how it works (what it is )
let db;
const DATABASE_NAME = "surgeryDatabase";
const DATABASE_VERSION = 1;
const ENCRYPTION_KEY = "secure-key";

const permissions = {
    Admin: { canManagePatients: true },
    Patient: { canBookAppointments: true, canViewMedication: true },
    Doctor: { canReviewPatientHistory: true }
};

// Initialize the IndexedDB database
function initializeDatabase() {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = (event) => {
        console.error("Database initialization failed:", event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.info("Database connected");
        loadAndStoreData();
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        db.createObjectStore("administrators", { keyPath: "username" });
        db.createObjectStore("patients", { keyPath: "NHS" });
        db.createObjectStore("doctors", { keyPath: "username" });
        db.createObjectStore("medications", { keyPath: "id" });
        db.createObjectStore("appointments", { autoIncrement: true });
        db.createObjectStore("notes", { autoIncrement: true });
        console.info("Database schema created with object stores");
    };
}

function loadPatients() {
    const transaction = db.transaction(["patients"], "readonly");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const patients = event.target.result.map(patient => ({
            ...patient,
            NHS: secureDecrypt(patient.NHS) // Decrypt the NHS number for display
        }));

        const patientList = document.getElementById("patientList");
        patientList.innerHTML = "";

        patients.forEach(patient => {
            const listItem = document.createElement("li");
            listItem.textContent = `${patient.First} ${patient.Last} - ${patient.NHS}`;
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.onclick = () => editPatient(patient);
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => deletePatient(patient.NHS);
            listItem.appendChild(editButton);
            listItem.appendChild(deleteButton);
            patientList.appendChild(listItem);
        });
    };
}



function storeData(storeName, records) {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    records.forEach(record => {
        store.put(record);
    });

    transaction.oncomplete = () => {
        console.log(`Data stored successfully in ${storeName}`);
    };

    transaction.onerror = (event) => {
        console.error(`Failed to store data in ${storeName}:`, event.target.error);
    };
}

function updateInputForAccountType() {
    const accountType = document.getElementById("accountType").value;
    const usernameInput = document.getElementById("username");
    const passwordInfo = document.getElementById("password-info");

    if (accountType === "Patient") {
        usernameInput.placeholder = "NHS Number";
        passwordInfo.style.display = "block";
    } else {
        usernameInput.placeholder = "Username";
        passwordInfo.style.display = "none";
    }
}
function logout() {
    // Hide all panels
    document.getElementById("AdminFunctions").style.display = "none";
    document.getElementById("PatientFunctions").style.display = "none";
    document.getElementById("login-section").style.display = "block";

    // Hide the logout button
    document.getElementById("logout-button").style.display = "none";

    // Optionally, clear any session-specific variables or local storage here
    console.info("User logged out successfully.");
}
function authenticate() {
    const accountType = document.getElementById("accountType").value;
    const username = sanitize(document.getElementById("username").value);
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");

    errorMessage.textContent = "";

    let storeName;
    if (accountType === "Admin") storeName = "administrators";
    else if (accountType === "Patient") storeName = "patients";
    else if (accountType === "Doctor") storeName = "doctors";
    else {
        errorMessage.textContent = "Invalid account type selected.";
        return;
    }

    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(username);

    request.onsuccess = (event) => {
        const user = event.target.result;

        if (user) {
            let expectedPassword;
            if (accountType === "Patient") {
                expectedPassword = `${user.DOB.split("/")[2]}${user.Last.toUpperCase()}@${user.First.toLowerCase()}`;
            } else {
                expectedPassword = secureDecrypt(user.password);
            }

            if (expectedPassword === password) {
                // Hide the login section
                document.getElementById("login-section").style.display = "none";

                // Show the logout button
                document.getElementById("logout-button").style.display = "block";

                // Display the appropriate panel
                if (accountType === "Admin" && permissions.Admin.canManagePatients) {
                    showAdminPanel(user); // Pass the logged-in admin object
                } else if (accountType === "Patient" && permissions.Patient.canBookAppointments) {
                    showPatientPanel(user);
                }
                // Add doctor functionality if needed
            } else {
                errorMessage.textContent = "Invalid username or password.";
            }
        } else {
            errorMessage.textContent = "User not found.";
        }
    };

    request.onerror = (event) => {
        errorMessage.textContent = "Error retrieving user data.";
        console.error("Error retrieving user data:", event);
    };
}




function showAdminPanel(user) {
    // Display the Admin Panel
    document.getElementById("AdminFunctions").style.display = "block";

    // Update the Admin Panel heading to include the logged-in admin's username
    const adminHeading = document.querySelector("#AdminFunctions h3");
    adminHeading.textContent = `Admin Panel - Logged in as ${user.username}`;

    // Load the list of patients
    loadPatients();
}

function showAdminPanel(user) {
    // displaying the Admin Panel (sheilah + sheilah123)
    document.getElementById("AdminFunctions").style.display = "block";


    const adminHeading = document.querySelector("#AdminFunctions h3");
    adminHeading.textContent = `Admin Panel - Logged in as ${user.username}`;

    loadPatients();
}



function loadPatients() {
    const transaction = db.transaction(["patients"], "readonly");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const patients = event.target.result;
        const patientList = document.getElementById("patientList");
        patientList.innerHTML = "";

        patients.forEach((patient) => {
            const listItem = document.createElement("li");
            listItem.textContent = `${patient.First} ${patient.Last} - ${patient.NHS}`;
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.onclick = () => editPatient(patient);
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.onclick = () => deletePatient(patient.NHS);
            listItem.appendChild(editButton);
            listItem.appendChild(deleteButton);
            patientList.appendChild(listItem);
        });
    };
}

function editPatient(patient) {
    const nhs = prompt("Edit NHS Number:", secureDecrypt(patient.NHS));
    const name = prompt("Edit Name:", `${secureDecrypt(patient.First)} ${secureDecrypt(patient.Last)}`);
    const address = prompt("Edit Address:", secureDecrypt(patient.Address));
    const telephone = prompt("Edit Telephone:", secureDecrypt(patient.Telephone));
    const dob = prompt("Edit DOB (dd/mm/yyyy):", secureDecrypt(patient.DOB));

    if (!nhs || !name || !address || !telephone || !dob) {
        alert("All fields must be filled!");
        return;
    }

    const updatedPatient = {
        ...patient,
        NHS: secureEncrypt(nhs),
        First: secureEncrypt(name.split(" ")[0]),
        Last: secureEncrypt(name.split(" ")[1] || ""),
        Address: secureEncrypt(address),
        Telephone: secureEncrypt(telephone),
        DOB: secureEncrypt(dob)
    };

    const transaction = db.transaction(["patients"], "readwrite");
    const store = transaction.objectStore("patients");
    store.put(updatedPatient);

    transaction.oncomplete = () => {
        alert("Patient updated successfully!");
        loadPatients();
    };

    transaction.onerror = (event) => {
        console.error("Failed to update patient:", event.target.error);
    };
}
function migrateData() {
    const transaction = db.transaction(["patients"], "readwrite");
    const store = transaction.objectStore("patients");

    const request = store.getAll();

    request.onsuccess = (event) => {
        const patients = event.target.result;

        patients.forEach(patient => {
            let isEncrypted = false;

            try {
                // Check if NHS is already encrypted
                secureDecrypt(patient.NHS);
                isEncrypted = true;
            } catch (error) {
                // If decryption fails, the NHS is not encrypted
                isEncrypted = false;
            }

            if (!isEncrypted) {
                console.log(`Encrypting patient: ${patient.NHS}`);

                // Encrypt the NHS and other sensitive fields
                const updatedPatient = {
                    ...patient,
                    NHS: secureEncrypt(patient.NHS),
                    Title: secureEncrypt(patient.Title),
                    First: secureEncrypt(patient.First),
                    Last: secureEncrypt(patient.Last),
                    DOB: secureEncrypt(patient.DOB),
                    Address: secureEncrypt(patient.Address),
                    Email: secureEncrypt(patient.Email),
                    Telephone: secureEncrypt(patient.Telephone)
                };

                // Store the updated patient back in the database
                store.put(updatedPatient);
            } else {
                console.log(`Skipping already encrypted patient: ${patient.NHS}`);
            }
        });

        transaction.oncomplete = () => {
            console.info("Migration completed: All patient records are now encrypted.");
        };

        transaction.onerror = (event) => {
            console.error("Migration failed:", event.target.error);
        };
    };

    request.onerror = (event) => {
        console.error("Failed to retrieve patients for migration:", event.target.error);
    };
}


function deletePatient(nhs) {
    const transaction = db.transaction(["patients"], "readwrite");
    const store = transaction.objectStore("patients");
    store.delete(nhs);

    transaction.oncomplete = () => {
        alert("Patient deleted successfully!");
        loadPatients();
    };

    transaction.onerror = (event) => {
        console.error("Failed to delete patient:", event.target.error);
    };
}

// Book an Appointment
// Show Patient Panel with Appointments and Prescriptions
function showPatientPanel(user) {
    document.getElementById("PatientFunctions").style.display = "block";
    loadMedicines();
    loadPatientInfo(user);
    loadAppointments(user);
}

// Book an Appointment
// Book an Appointment
function bookAppointment(user) {
    const appointmentDateInput = document.getElementById("appointmentDate");
    const appointmentReasonInput = document.getElementById("appointmentReason");

    const appointmentDate = appointmentDateInput ? appointmentDateInput.value : null;
    const appointmentReason = appointmentReasonInput ? appointmentReasonInput.value : null;

    if (!appointmentDate || !appointmentReason) {
        alert("Please fill in both the date and reason for booking.");
        return;
    }

    const newAppointment = {
        NHS: secureEncrypt(user.NHS),
        date: secureEncrypt(appointmentDate),
        reason: secureEncrypt(appointmentReason),
    };

    const transaction = db.transaction(["appointments"], "readwrite");
    const store = transaction.objectStore("appointments");
    store.add(newAppointment);

    transaction.oncomplete = () => {
        alert("Appointment booked successfully!");
        document.getElementById("appointmentForm").reset();
        loadAppointments(user); // Reload appointments for the user
    };

    transaction.onerror = (event) => {
        console.error("Failed to book appointment:", event.target.error);
    };
}


// Load Appointments for the Patient
function loadAppointments(user) {
    const transaction = db.transaction(["appointments"], "readonly");
    const store = transaction.objectStore("appointments");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const encryptedAppointments = event.target.result.filter(
            (app) => secureDecrypt(app.NHS) === user.NHS
        );

        const decryptedAppointments = encryptedAppointments.map((appointment) => ({
            date: secureDecrypt(appointment.date),
            reason: secureDecrypt(appointment.reason),
        }));

        const appointmentList = document.getElementById("appointmentList");
        appointmentList.innerHTML = "";

        decryptedAppointments.forEach((app) => {
            const listItem = document.createElement("li");
            listItem.textContent = `Date: ${formatDate(app.date)}, Reason: ${app.reason}`;
            appointmentList.appendChild(listItem);
        });
    };

    request.onerror = (event) => {
        console.error("Failed to load appointments:", event.target.error);
    };
}

// Format Date to Fix Extra Slashes
function formatDate(inputDate) {
    const date = new Date(inputDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}


// Load Medications for Prescription Requests
function loadMedicines() {
    const transaction = db.transaction(["medications"], "readonly");
    const store = transaction.objectStore("medications");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const medicines = event.target.result;
        const prescriptionDropdown = document.getElementById("prescriptionDropdown");
        prescriptionDropdown.innerHTML = ""; // Clear existing options

        medicines.forEach((medicine) => {
            const option = document.createElement("option");
            option.value = medicine.Drug;
            option.textContent = medicine.Drug;
            prescriptionDropdown.appendChild(option);
        });
    };

    request.onerror = (event) => {
        console.error("Failed to load medicines:", event.target.error);
    };
}


// Request Prescription
function requestPrescriptions(user) {
    const prescriptionDropdown = document.getElementById("prescriptionDropdown");
    const selectedOptions = Array.from(prescriptionDropdown.selectedOptions).map(option => option.value);

    if (selectedOptions.length === 0) {
        alert("Please select at least one prescription.");
        return;
    }

    const transaction = db.transaction(["appointments"], "readwrite");
    const store = transaction.objectStore("appointments");
    const prescriptionRequest = {
        userNHS: user.NHS,
        prescriptions: selectedOptions,
        timestamp: new Date().toISOString()
    };

    store.add(prescriptionRequest);

    transaction.oncomplete = () => {
        alert("Prescription request submitted successfully!");
    };

    transaction.onerror = (event) => {
        console.error("Failed to request prescriptions:", event.target.error);
    };
}



function loadPatientInfo(user) {
    const patientInfo = `Name: ${user.First} ${user.Last}
    NHS: ${user.NHS}
    DOB: ${user.DOB}
    Address: ${user.Address}`;
    document.getElementById("patientInfo").textContent = patientInfo;
}

function secureEncrypt(plainText) {
    return CryptoJS.AES.encrypt(plainText, ENCRYPTION_KEY).toString();
}

function secureDecrypt(cipherText) {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

function sanitize(input) {
    const element = document.createElement('div');
    element.innerText = input;
    return element.innerHTML;
}

document.addEventListener("DOMContentLoaded", initializeDatabase);
