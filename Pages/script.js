let db;
const DATABASE_NAME = "surgeryDatabase";
const DATABASE_VERSION = 1;
const ENCRYPTION_KEY = "secure-key";

// Define permissions for each role
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
        loadAndStoreData(); // Populate data after database is ready
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

// Load data from JSON files and store in IndexedDB
function loadAndStoreData() {
    fetch('/admin.json')
        .then(response => {
            if (!response.ok) throw new Error('Admin data not found');
            return response.json();
        })
        .then(data => {
            const encryptedData = data.map(user => ({
                ...user,
                password: secureEncrypt(user.password)
            }));
            storeData("administrators", encryptedData);
        })
        .catch(error => console.error("Failed to retrieve admin data:", error));

    fetch('/doctor.json')
        .then(response => {
            if (!response.ok) throw new Error('Doctor data not found');
            return response.json();
        })
        .then(data => {
            const encryptedData = data.map(user => ({
                ...user,
                password: secureEncrypt(user.password)
            }));
            storeData("doctors", encryptedData);
        })
        .catch(error => console.error("Failed to retrieve doctor data:", error));

    // Corrected path for patient data
    fetch('/patients.json')
        .then(response => {
            if (!response.ok) throw new Error('Patient data not found');
            return response.json();
        })
        .then(data => storeData("patients", data))
        .catch(error => console.error("Failed to retrieve patient data:", error));

    fetch('/medicine.json')
        .then(response => {
            if (!response.ok) throw new Error('Medication data not found');
            return response.json();
        })
        .then(data => storeData("medications", data))
        .catch(error => console.error("Failed to retrieve medication data:", error));
}


// Store data in a specific IndexedDB object store
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

// Update the placeholder and password instructions based on account type selection
function updateInputForAccountType() {
    const accountType = document.getElementById("accountType").value;
    const usernameInput = document.getElementById("username");
    const passwordInfo = document.getElementById("password-info");

    if (accountType === "Patient") {
        usernameInput.placeholder = "NHS Number";
        passwordInfo.style.display = "block"; // Show password formula info for patients
    } else {
        usernameInput.placeholder = "Username";
        passwordInfo.style.display = "none"; // Hide password formula info for other account types
    }
}

// Authenticate user by checking data in IndexedDB
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
                displayPanel(accountType);
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

// Show appropriate panel based on role and permissions
function displayPanel(role) {
    document.getElementById("login-section").style.display = "none";

    if (role === "Admin" && permissions.Admin.canManagePatients) showAdminPanel();
    if (role === "Patient" && permissions.Patient.canBookAppointments) showPatientPanel();
    if (role === "Doctor" && permissions.Doctor.canReviewPatientHistory) showDoctorPanel();
}

// Admin functionality to manage patient information
function showAdminPanel() {
    document.getElementById("AdminPatientSection").style.display = "block";

    const transaction = db.transaction(["patients"], "readonly");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const patients = event.target.result;
        const patientList = document.getElementById("patientList");
        patientList.innerHTML = "";

        patients.forEach(patient => {
            const listItem = document.createElement("li");
            listItem.textContent = `${patient.First} ${patient.Last}`;
            listItem.onclick = () => editPatient(patient);
            patientList.appendChild(listItem);
        });
    };
}

// Patient functionality to book appointments and view medications
function showPatientPanel() {
    document.getElementById("PatientAppointmentSection").style.display = "block";
    document.getElementById("PatientMedicationSection").style.display = "block";
}

// Doctor functionality to review patient history and add medical notes
function showDoctorPanel() {
    document.getElementById("DoctorPatientHistorySection").style.display = "block";
    document.getElementById("DoctorPatientNotesSection").style.display = "block";
}

// Utility functions for encryption, decryption, and sanitization
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

// Initialize database on page load
document.addEventListener("DOMContentLoaded", initializeDatabase);
