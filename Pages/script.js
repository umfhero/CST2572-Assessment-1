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

    request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("patients")) {
            db.createObjectStore("patients", { keyPath: "NHS" });
        }
        if (!db.objectStoreNames.contains("administrators")) {
            db.createObjectStore("administrators", { keyPath: "username" });
        }
        if (!db.objectStoreNames.contains("doctors")) {
            db.createObjectStore("doctors", { keyPath: "username" });
        }
        if (!db.objectStoreNames.contains("medications")) {
            db.createObjectStore("medications", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("appointments")) {
            db.createObjectStore("appointments", { autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("prescriptions")) {
            db.createObjectStore("prescriptions", { autoIncrement: true });
        }
        console.log("Database structure created.");
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("Database opened successfully.");
        loadAndStoreData(); // Call JSON loader here
    };

    request.onerror = (event) => {
        console.error("Error opening database:", event.target.error);
    };
}
function loadAndStoreData() {
    // Load admin data
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

    // Load doctor data
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

    // Load patient data
    fetch('/patients.json')
        .then(response => {
            if (!response.ok) throw new Error('Patient data not found');
            return response.json();
        })
        .then(data => storeData("patients", data))
        .catch(error => console.error("Failed to retrieve patient data:", error));

    // Load medication data
    fetch('/medicines.json')
        .then(response => {
            if (!response.ok) throw new Error('Medication data not found');
            return response.json();
        })
        .then(data => {
            console.log("Medications loaded from JSON:", data); // Log the data to verify
            storeData("medications", data);
        })
        .catch(error => console.error("Failed to retrieve medication data:", error));
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

    records.forEach(record => store.put(record));

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

    const transaction = db.transaction(["administrators"], "readonly");
    const store = transaction.objectStore("administrators");
    const request = store.get(username);

    request.onsuccess = (event) => {
        const user = event.target.result;

        if (user) {
            const expectedPassword = secureDecrypt(user.password);

            if (expectedPassword === password) {
                loggedInUser = user; // Set the global loggedInUser variable

                // Hide the login section
                document.getElementById("login-section").style.display = "none";

                // Show the logout button
                document.getElementById("logout-button").style.display = "block";

                // Display panels based on account type
                if (accountType === "Admin") {
                    showAdminPanel(user);
                } else if (accountType === "Doctor") {
                    showDoctorPanel(user);
                } else if (accountType === "Patient") {
                    showPatientPanel(user);
                }
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
function showDoctorPanel(user) {
    // Display the Doctor Panel
    const doctorPanel = document.getElementById("DoctorFunctions");
    doctorPanel.style.display = "block";

    // Ensure patients are loaded into the Doctor Panel
    loadDoctorPatients(); // Load the list of patients

    // Clear any old data related to appointments or prescriptions for this session
    const appointmentList = document.getElementById("doctorAppointmentList");
    const prescriptionList = document.getElementById("doctorPrescriptionList");
    appointmentList.innerHTML = "";
    prescriptionList.innerHTML = "";

    // Update the panel heading with the doctor's username
    const doctorHeading = document.querySelector("#DoctorFunctions h3");
    doctorHeading.textContent = `Doctor Panel - Logged in as ${user.username}`;
}



function loadAppointmentsForDoctor(patient) {
    const transaction = db.transaction(["appointments"], "readonly");
    const store = transaction.objectStore("appointments");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const appointments = event.target.result
            .filter(app => secureDecrypt(app.NHS) === patient.NHS)
            .map(app => ({
                date: secureDecrypt(app.date),
                reason: secureDecrypt(app.reason)
            }));

        let message = `Appointments for ${patient.First} ${patient.Last}:\n`;
        appointments.forEach(app => {
            message += `Date: ${formatDate(app.date)}, Reason: ${app.reason}\n`;
        });

        alert(message);
    };

    request.onerror = (event) => {
        console.error("Failed to load appointments for patient:", event.target.error);
    };
}


function loadPrescriptionsForDoctor(patient) {
    const transaction = db.transaction(["prescriptions"], "readonly");
    const store = transaction.objectStore("prescriptions");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const prescriptions = event.target.result
            .filter(pres => secureDecrypt(pres.NHS) === patient.NHS)
            .map(pres => ({
                medication: secureDecrypt(pres.prescription),
                dateRequested: secureDecrypt(pres.timestamp)
            }));

        let message = `Prescriptions for ${patient.First} ${patient.Last}:\n`;
        prescriptions.forEach(pres => {
            message += `Medication: ${pres.medication}, Requested On: ${formatDate(pres.dateRequested)}\n`;
        });

        alert(message);
    };

    request.onerror = (event) => {
        console.error("Failed to load prescriptions for patient:", event.target.error);
    };
}



function loadDoctorPatients() {
    const transaction = db.transaction(["patients"], "readonly");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const patients = event.target.result.map(patient => ({
            ...patient,
            NHS: secureDecrypt(patient.NHS),
            First: secureDecrypt(patient.First),
            Last: secureDecrypt(patient.Last),
            DOB: secureDecrypt(patient.DOB),
            Address: secureDecrypt(patient.Address),
        }));

        const doctorPatientList = document.getElementById("doctorPatientList");
        doctorPatientList.innerHTML = ""; // Clear any previous entries

        patients.forEach(patient => {
            const listItem = document.createElement("li");
            listItem.textContent = `${patient.First} ${patient.Last} - ${patient.NHS}`;

            // Create action buttons for each patient
            const viewAppointmentsButton = document.createElement("button");
            viewAppointmentsButton.textContent = "View Appointments";
            viewAppointmentsButton.onclick = () => loadAppointmentsForDoctor(patient);

            const viewPrescriptionsButton = document.createElement("button");
            viewPrescriptionsButton.textContent = "View Prescriptions";
            viewPrescriptionsButton.onclick = () => loadPrescriptionsForDoctor(patient);

            const editNotesButton = document.createElement("button");
            editNotesButton.textContent = "Edit Notes";
            editNotesButton.onclick = () => editPatientNotes(patient);

            // Append buttons to the list item
            listItem.appendChild(viewAppointmentsButton);
            listItem.appendChild(viewPrescriptionsButton);
            listItem.appendChild(editNotesButton);

            doctorPatientList.appendChild(listItem);
        });
    };

    request.onerror = (event) => {
        console.error("Failed to load patients for doctor panel:", event.target.error);
    };
}


function editPatientNotes(patient) {
    const note = prompt(`Enter a note for ${patient.First} ${patient.Last}:`, "");

    if (note) {
        const transaction = db.transaction(["notes"], "readwrite");
        const store = transaction.objectStore("notes");
        const newNote = {
            patientNHS: secureEncrypt(patient.NHS),
            note: secureEncrypt(note),
            timestamp: secureEncrypt(new Date().toISOString())
        };

        store.add(newNote);

        transaction.oncomplete = () => {
            alert("Note added successfully!");
        };

        transaction.onerror = (event) => {
            console.error("Failed to add note:", event.target.error);
        };
    }
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
    loadRequestedPrescriptions(user); // Load the patient's requested prescriptions
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
        document.getElementById("appointmentForm").reset(); // Clear form inputs
        loadAppointments(user); // Reload appointments for the user
    };

    transaction.onerror = (event) => {
        console.error("Failed to book appointment:", event.target.error);
        alert("Failed to book the appointment. Please try again.");
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
            option.value = medicine.Drug; // Set the value to the medication name
            option.textContent = medicine.Drug; // Display the medication name
            prescriptionDropdown.appendChild(option);
        });

        console.log("Medications loaded into dropdown:", medicines); // Log to verify
    };

    request.onerror = (event) => {
        console.error("Failed to load medicines:", event.target.error);
    };
}





// Request Prescription
function requestPrescriptions(user) {
    if (!user) {
        alert("No user is logged in.");
        console.error("Error: No user object provided to requestPrescriptions.");
        return;
    }

    const prescriptionDropdown = document.getElementById("prescriptionDropdown");
    const selectedOptions = Array.from(prescriptionDropdown.selectedOptions).map(option => option.value);

    if (selectedOptions.length === 0) {
        alert("Please select at least one prescription.");
        return;
    }

    const newPrescriptionRecord = {
        NHS: secureEncrypt(user.NHS), // Encrypt NHS number
        prescriptions: selectedOptions.map(secureEncrypt), // Encrypt each prescription
        timestamp: new Date().toISOString() // Add a timestamp
    };

    const transaction = db.transaction(["prescriptions"], "readwrite");
    const store = transaction.objectStore("prescriptions");

    store.add(newPrescriptionRecord); // Add the new record to the store

    transaction.oncomplete = () => {
        alert("Prescription request submitted successfully!");
        prescriptionDropdown.value = ""; // Clear the selection
        console.log("Prescription stored in IndexedDB:", newPrescriptionRecord);

        loadRequestedPrescriptions(user); // Refresh the requested prescriptions list
    };

    transaction.onerror = (event) => {
        console.error("Failed to request prescriptions:", event.target.error);
        alert("Failed to submit the prescription request. Please try again.");
    };
}



function loadRequestedPrescriptions(user) {
    if (!user) {
        console.error("No user is logged in.");
        return;
    }

    const transaction = db.transaction(["prescriptions"], "readonly");
    const store = transaction.objectStore("prescriptions");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const prescriptions = event.target.result.filter(prescription => secureDecrypt(prescription.NHS) === user.NHS);

        const requestedPrescriptionsList = document.getElementById("requestedPrescriptionsList");
        requestedPrescriptionsList.innerHTML = ""; // Clear existing list

        prescriptions.forEach(prescription => {
            const decryptedPrescriptions = prescription.prescriptions.map(secureDecrypt);

            const listItem = document.createElement("li");
            listItem.textContent = `Requested: ${decryptedPrescriptions.join(", ")}`;
            requestedPrescriptionsList.appendChild(listItem);
        });
    };

    request.onerror = (event) => {
        console.error("Failed to load requested prescriptions:", event.target.error);
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
function preloadData(db) {
    // Preload data into 'patients'
    const patientTransaction = db.transaction(["patients"], "readwrite");
    const patientStore = patientTransaction.objectStore("patients");

    const defaultPatients = [
        { NHS: "1234567890", First: "Alice", Last: "Smith", DOB: "01/01/1980", Address: "123 Wellness St" },
        { NHS: "0987654321", First: "Bob", Last: "Jones", DOB: "15/06/1975", Address: "456 Care Blvd" }
    ];

    defaultPatients.forEach(patient => patientStore.add(patient));

    patientTransaction.oncomplete = () => {
        console.log("Default patients added successfully.");
    };

    patientTransaction.onerror = (event) => {
        console.error("Error adding default patients:", event.target.error);
    };

    // Preload data into 'administrators'
    const adminTransaction = db.transaction(["administrators"], "readwrite");
    const adminStore = adminTransaction.objectStore("administrators");



    defaultAdmins.forEach(admin => adminStore.add(admin));

    adminTransaction.oncomplete = () => {
        console.log("Default administrators added successfully.");
    };

    adminTransaction.onerror = (event) => {
        console.error("Error adding default administrators:", event.target.error);
    };
}

document.addEventListener("DOMContentLoaded", initializeDatabase);

