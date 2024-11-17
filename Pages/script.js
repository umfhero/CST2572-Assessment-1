//1055801944
//1985NORVILL@aeriell
// ask which lines are encryption and how it works (what it is )
let db;
let dataLoaded = false;
const DATABASE_NAME = "surgeryDatabase";
const DATABASE_VERSION = 1;
const ENCRYPTION_KEY = "secure-key";

const permissions = {
    Admin: { canManagePatients: true },
    Patient: { canBookAppointments: true, canViewMedication: true },
    Doctor: { canReviewPatientHistory: true }
};
function clearAndLoadData() {
    const transaction = db.transaction(["patients"], "readwrite");
    const store = transaction.objectStore("patients");

    store.clear(); // Clear all existing records before loading new data

    transaction.oncomplete = () => {
        console.log("Cleared old patient data. Reloading...");
        dataLoaded = false; // Reset the flag to allow fresh data loading
        loadAndStoreData();
    };

    transaction.onerror = (event) => {
        console.error("Error clearing patient data:", event.target.error);
    };
}


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

        // Migrate old data first
        migrateData(() => {
            console.log("Migration completed. Now loading new data...");
            loadAndStoreData(); // Load new data after migration is done
        });
    };

    request.onerror = (event) => {
        console.error("Error opening database:", event.target.error);
    };
}



function loadAndStoreData() {
    // Check if patients data already exists
    const transaction = db.transaction(["patients"], "readonly");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const existingPatients = event.target.result;

        if (existingPatients.length > 0) {
            console.log(`Database already contains ${existingPatients.length} patients. Skipping JSON load.`);
            return; // Stop if data already exists
        }

        console.log("Database is empty. Loading data from JSON...");

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
            .then(response => response.json())
            .then(data => {
                const uniquePatients = Array.from(
                    new Map(data.map(patient => [patient.NHS, patient])).values()
                ); // Deduplicate patients from the source

                console.log(`Unique patients loaded: ${uniquePatients.length}`);

                const patientTransaction = db.transaction(["patients"], "readwrite");
                const patientStore = patientTransaction.objectStore("patients");

                uniquePatients.forEach(patient => {
                    patientStore.add({
                        NHS: secureEncrypt(patient.NHS),
                        First: secureEncrypt(patient.First),
                        Last: secureEncrypt(patient.Last),
                        DOB: secureEncrypt(patient.DOB),
                        Address: secureEncrypt(patient.Address),
                        Email: secureEncrypt(patient.Email),
                        Telephone: secureEncrypt(patient.Telephone),
                        Gender: secureEncrypt(patient.Gender),
                        Title: secureEncrypt(patient.Title),
                    });
                });

                patientTransaction.oncomplete = () => {
                    console.log("Patient data loaded successfully.");
                };

                patientTransaction.onerror = (event) => {
                    console.error("Error loading patient data:", event.target.error);
                };
            })
            .catch(error => console.error("Error fetching patient data:", error));

        // Load medication data
        fetch('/medicines.json')
        .then(response => {
            if (!response.ok) throw new Error('Medication data not found');
            return response.json();
        })
        .then(data => {
            console.log("Medications loaded from JSON:", data);
            storeData("medications", data);
        })
        .catch(error => console.error("Failed to retrieve medication data:", error));
    };

    request.onerror = (event) => {
        console.error("Error checking existing data in database:", event.target.error);
    };
}


function filterPatients() {
    const searchQuery = document.getElementById("searchBar").value.toLowerCase(); // Get the search query
    const patientListItems = document.querySelectorAll("#doctorPatientList li"); // Get all patient list items

    patientListItems.forEach((item) => {
        const patientText = item.textContent.toLowerCase(); // Get the text content of the patient
        if (patientText.includes(searchQuery)) {
            item.style.display = ""; // Show the item if it matches the search
        } else {
            item.style.display = "none"; // Hide the item if it doesn't match
        }
    });
}


function loadPatients() {
    const transaction = db.transaction(["patients"], "readonly");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const patients = event.target.result.map(patient => {
            try {
                // Try decrypting patient data
                return {
                    NHS: secureDecrypt(patient.NHS) || "Unknown",
                    First: secureDecrypt(patient.First) || "Unknown",
                    Last: secureDecrypt(patient.Last) || "Unknown",
                    DOB: secureDecrypt(patient.DOB) || "Unknown",
                    Address: secureDecrypt(patient.Address) || "Unknown",
                };
            } catch (error) {
                console.error("Failed to decrypt patient data:", patient, error);
                // If decryption fails, fallback to raw data
                return {
                    NHS: patient.NHS || "Unknown",
                    First: patient.First || "Unknown",
                    Last: patient.Last || "Unknown",
                    DOB: patient.DOB || "Unknown",
                    Address: patient.Address || "Unknown",
                };
            }
        });

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

    request.onerror = (event) => {
        console.error("Failed to load patients for admin panel:", event.target.error);
    };
}






function storeData(storeName, records) {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    records.forEach(record => {
        console.log(`Storing record in ${storeName}:`, record); // Log data being stored
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

    if (accountType === "Patient") {
        // Patient login logic
        const transaction = db.transaction(["patients"], "readonly");
        const store = transaction.objectStore("patients");
        const request = store.getAll();

        request.onsuccess = (event) => {
            const patients = event.target.result;

            const matchingPatient = patients.find(patient => {
                const decryptedNHS = secureDecrypt(patient.NHS);
                const decryptedLastName = secureDecrypt(patient.Last).toUpperCase();
                const decryptedFirstName = secureDecrypt(patient.First).toLowerCase();
                const decryptedDOB = secureDecrypt(patient.DOB);

                // Extract the year of birth
                const yearOfBirth = decryptedDOB.split("/")[2];

                // Expected password format
                const expectedPassword = `${yearOfBirth}${decryptedLastName}@${decryptedFirstName}`;

                return decryptedNHS === username && expectedPassword === password;
            });

            if (matchingPatient) {
                loggedInUser = matchingPatient; // Set the global loggedInUser variable

                // Hide the login section
                document.getElementById("login-section").style.display = "none";

                // Show the logout button
                document.getElementById("logout-button").style.display = "block";

                // Show the patient panel
                showPatientPanel(matchingPatient);
            } else {
                errorMessage.textContent = "Invalid NHS number or password.";
            }
        };

        request.onerror = (event) => {
            errorMessage.textContent = "Error retrieving patient data.";
            console.error("Error retrieving patient data:", event);
        };
    } else {
        // Shared logic for Admin and Doctor accounts
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
    const doctorPanel = document.getElementById("DoctorFunctions");
    if (doctorPanel) {
        doctorPanel.style.display = "block";

        // Load patients for the doctor
        loadDoctorPatients();

        const doctorHeading = document.querySelector("#DoctorFunctions h3");
        doctorHeading.textContent = `Doctor Panel - Logged in as ${user.username}`;
    } else {
        console.error("Doctor Panel not found in the DOM.");
    }
}




function loadAppointmentsForDoctor(patient) {
    const transaction = db.transaction(["appointments"], "readonly");
    const store = transaction.objectStore("appointments");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const appointments = event.target.result.filter(app => {
            try {
                const decryptedNHS = secureDecrypt(app.NHS);
                console.log(`Matching NHS: ${decryptedNHS} === ${patient.NHS}`);
                return decryptedNHS === patient.NHS; // Match decrypted NHS
            } catch (error) {
                console.error("Error decrypting NHS for appointment:", error);
                return false;
            }
        }).map(app => {
            try {
                return {
                    date: secureDecrypt(app.date),
                    reason: secureDecrypt(app.reason),
                };
            } catch (error) {
                console.error("Error decrypting appointment fields:", error);
                return null;
            }
        }).filter(Boolean); // Filter out any null results from failed decryption

        // Display the appointments
        if (appointments.length === 0) {
            alert(`No appointments found for ${patient.First} ${patient.Last}`);
        } else {
            let message = `Appointments for ${patient.First} ${patient.Last}:\n`;
            appointments.forEach(app => {
                message += `Date: ${formatDate(app.date)}, Reason: ${app.reason}\n`;
            });
            alert(message);
        }
    };

    request.onerror = (event) => {
        console.error("Error retrieving appointments:", event.target.error);
    };
}


function loadPrescriptionsForDoctor(patient) {
    const transaction = db.transaction(["prescriptions"], "readonly");
    const store = transaction.objectStore("prescriptions");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const allPrescriptions = event.target.result;

        console.log("All prescriptions from DB:", allPrescriptions); // Log all retrieved prescriptions

        // Filter prescriptions for the specific patient
        const prescriptions = allPrescriptions.filter((pres) => {
            const decryptedNHS = secureDecrypt(pres.NHS);
            console.log("Decrypted NHS:", decryptedNHS, "Expected:", patient.NHS);

            if (decryptedNHS === patient.NHS) {
                console.log("Matching prescription found:", pres);
                return true;
            } else {
                console.log("No match for prescription:", pres);
                return false;
            }
        });

        console.log("Filtered prescriptions for patient:", prescriptions); // Log filtered prescriptions

        if (prescriptions.length === 0) {
            alert(`No prescriptions found for ${patient.First} ${patient.Last}`);
        } else {
            let message = `Prescriptions for ${patient.First} ${patient.Last}:\n`;
            prescriptions.forEach((pres) => {
                const decryptedPrescriptions = pres.prescriptions.map(secureDecrypt);
                const decryptedTimestamp = secureDecrypt(pres.timestamp);

                message += `Medications: ${decryptedPrescriptions.join(", ")}, Requested On: ${formatDate(decryptedTimestamp)}\n`;
            });
            alert(message);
        }
    };

    request.onerror = (event) => {
        console.error("Error retrieving prescriptions:", event.target.error);
    };
}






function loadAppointmentsForDoctor(patient) {
    const transaction = db.transaction(["appointments"], "readonly");
    const store = transaction.objectStore("appointments");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const appointments = event.target.result.filter(app => {
            try {
                const decryptedNHS = secureDecrypt(app.NHS);
                console.log(`Decrypted NHS: ${decryptedNHS}`); // Log here
                console.log(`Matching NHS: ${decryptedNHS} === ${patient.NHS}`); // Log here
                return decryptedNHS === patient.NHS; // Match decrypted NHS
            } catch (error) {
                console.error("Error decrypting NHS for appointment:", error);
                return false;
            }
        }).map(app => {
            try {
                console.log("Decrypted Appointment Date:", secureDecrypt(app.date)); // Log here
                console.log("Decrypted Appointment Reason:", secureDecrypt(app.reason)); // Log here
                return {
                    date: secureDecrypt(app.date),
                    reason: secureDecrypt(app.reason),
                };
            } catch (error) {
                console.error("Error decrypting appointment fields:", error);
                return null;
            }
        }).filter(Boolean); // Filter out any null results from failed decryption

        // Display the appointments
        if (appointments.length === 0) {
            alert(`No appointments found for ${patient.First} ${patient.Last}`);
        } else {
            let message = `Appointments for ${patient.First} ${patient.Last}:\n`;
            appointments.forEach(app => {
                message += `Date: ${formatDate(app.date)}, Reason: ${app.reason}\n`;
            });
            alert(message);
        }
    };

    request.onerror = (event) => {
        console.error("Error retrieving appointments:", event.target.error);
    };
}



function isEncrypted(value) {
    try {
        secureDecrypt(value); // If decryption succeeds, it's encrypted
        return true;
    } catch {
        return false; // If decryption fails, it's not encrypted
    }
}

function loadDoctorPatients() {
    const transaction = db.transaction(["patients"], "readonly");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const patients = event.target.result.map(patient => {
            // Decrypt patient data for rendering
            return {
                NHS: secureDecrypt(patient.NHS),
                Title: secureDecrypt(patient.Title),
                First: secureDecrypt(patient.First),
                Last: secureDecrypt(patient.Last),
                DOB: secureDecrypt(patient.DOB),
                Address: secureDecrypt(patient.Address),
                Gender: secureDecrypt(patient.Gender),
            };
        });

        const doctorPatientList = document.getElementById("doctorPatientList");
        doctorPatientList.innerHTML = ""; // Clear existing entries

        patients.forEach(patient => {
            const listItem = document.createElement("li");

            // Patient Header
            const header = document.createElement("div");
            header.innerHTML = `<strong>Name:</strong> ${patient.Title} ${patient.First} ${patient.Last} | <strong>NHS:</strong> ${patient.NHS}`;
            listItem.appendChild(header);

            // Patient Details Section
            const details = document.createElement("div");
            details.classList.add("patient-details");
            details.innerHTML = `
                <p><strong>DOB:</strong> ${patient.DOB}</p>
                <p><strong>Address:</strong> ${patient.Address}</p>
                <p><strong>Gender:</strong> ${patient.Gender}</p>
            `;
            listItem.appendChild(details);

            // Buttons for Actions
            const viewAppointmentsButton = document.createElement("button");
            viewAppointmentsButton.textContent = "View Appointments";
            viewAppointmentsButton.onclick = () => loadAppointmentsForDoctor(patient);

            const viewPrescriptionsButton = document.createElement("button");
            viewPrescriptionsButton.textContent = "View Prescriptions";
            viewPrescriptionsButton.onclick = () => loadPrescriptionsForDoctor(patient);

            const editNotesButton = document.createElement("button");
            editNotesButton.textContent = "Add/Edit Notes";
            editNotesButton.onclick = () => editPatientNotes(patient);

            // Append Buttons
            listItem.appendChild(viewAppointmentsButton);
            listItem.appendChild(viewPrescriptionsButton);
            listItem.appendChild(editNotesButton);

            // Append to List
            doctorPatientList.appendChild(listItem);
        });
    };

    request.onerror = (event) => {
        console.error("Failed to load patients:", event.target.error);
    };
}


function togglePatientDetails(button) {
    const detailsSection = button.closest('li').querySelector('.patient-details');
    if (detailsSection.style.display === 'none' || detailsSection.style.display === '') {
        detailsSection.style.display = 'block';
        button.textContent = 'Hide Details';
    } else {
        detailsSection.style.display = 'none';
        button.textContent = 'View Details';
    }
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
        const patients = event.target.result.map(patient => {
            // Helper function to validate and decrypt
            const tryDecrypt = (value) => {
                try {
                    const decryptedValue = secureDecrypt(value);
                    // Check if decryption produced a valid string
                    if (decryptedValue && decryptedValue !== "Error") {
                        return decryptedValue;
                    }
                } catch (error) {
                    console.error("Failed to decrypt field:", value, error);
                }
                // Fallback to original value or "Unknown"
                return value || "Unknown";
            };

            // Attempt to decrypt each field
            return {
                NHS: tryDecrypt(patient.NHS),
                First: tryDecrypt(patient.First),
                Last: tryDecrypt(patient.Last),
                DOB: tryDecrypt(patient.DOB),
                Address: tryDecrypt(patient.Address),
            };
        });

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

    request.onerror = (event) => {
        console.error("Failed to load patients for admin panel:", event.target.error);
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
function migrateData(callback) {
    const transaction = db.transaction(["patients"], "readwrite");
    const store = transaction.objectStore("patients");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const allPatients = event.target.result;
        const seenNHS = new Map();
        const duplicatesToRemove = [];

        allPatients.forEach((patient) => {
            const isNHSAlreadyEncrypted = isEncrypted(patient.NHS);

            const nhs = isNHSAlreadyEncrypted
                ? secureDecrypt(patient.NHS) // Decrypt to check duplicates
                : patient.NHS;

            if (seenNHS.has(nhs)) {
                duplicatesToRemove.push(patient.NHS); // Mark duplicate for deletion
            } else {
                seenNHS.set(nhs, true);

                if (!isNHSAlreadyEncrypted) {
                    // Encrypt and update if not already encrypted
                    const encryptedPatient = {
                        ...patient,
                        NHS: secureEncrypt(patient.NHS),
                        First: secureEncrypt(patient.First),
                        Last: secureEncrypt(patient.Last),
                        DOB: secureEncrypt(patient.DOB),
                        Address: secureEncrypt(patient.Address),
                        Email: secureEncrypt(patient.Email),
                        Telephone: secureEncrypt(patient.Telephone),
                        Gender: secureEncrypt(patient.Gender),
                        Title: secureEncrypt(patient.Title),
                    };
                    store.put(encryptedPatient);
                }
            }
        });

        // Remove duplicates
        duplicatesToRemove.forEach((nhs) => store.delete(nhs));

        transaction.oncomplete = () => {
            console.log(`Migration completed: Removed ${duplicatesToRemove.length} duplicates.`);
            if (callback) callback(); // Proceed after migration
        };

        transaction.onerror = (event) => {
            console.error("Error during migration:", event.target.error);
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





function requestPrescriptions(user) {
    if (!user) {
        alert("No user is logged in.");
        return;
    }

    const prescriptionDropdown = document.getElementById("prescriptionDropdown");
    const selectedOptions = Array.from(prescriptionDropdown.selectedOptions).map(option => option.value);

    if (selectedOptions.length === 0) {
        alert("Please select at least one prescription.");
        return;
    }

    const newPrescriptionRecord = {
        NHS: secureEncrypt(user.NHS), // Encrypted NHS
        plainNHS: user.NHS, // Plain NHS (for debugging and matching)
        prescriptions: selectedOptions.map(secureEncrypt), // Encrypted prescriptions
        timestamp: secureEncrypt(new Date().toISOString()) // Encrypted timestamp
    };

    const transaction = db.transaction(["prescriptions"], "readwrite");
    const store = transaction.objectStore("prescriptions");

    store.add(newPrescriptionRecord);

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
        const prescriptions = event.target.result;
        console.log("All prescriptions from DB:", prescriptions);

        // Use plainNHS for matching
        const filteredPrescriptions = prescriptions.filter(prescription => {
            console.log("Checking prescription for plainNHS:", prescription.plainNHS, "Expected:", user.NHS);
            return prescription.plainNHS === user.NHS;
        });

        console.log("Filtered prescriptions for patient:", filteredPrescriptions);

        const requestedPrescriptionsList = document.getElementById("requestedPrescriptionsList");
        requestedPrescriptionsList.innerHTML = "";

        filteredPrescriptions.forEach(prescription => {
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
function loadPatientNotes(patient) {
    const transaction = db.transaction(["notes"], "readonly");
    const store = transaction.objectStore("notes");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const allNotes = event.target.result;

        // Filter notes by patient's NHS
        const patientNotes = allNotes.filter(note => note.plainNHS === patient.NHS);

        const notesList = document.getElementById("notesList");
        notesList.innerHTML = ""; // Clear existing notes

        patientNotes.forEach(note => {
            const listItem = document.createElement("li");
            listItem.textContent = `${secureDecrypt(note.note)} (Added on: ${new Date(note.timestamp).toLocaleString()})`;
            notesList.appendChild(listItem);
        });
    };

    request.onerror = (event) => {
        console.error("Failed to load notes for patient:", event.target.error);
    };
}
function loadPatientMedicines(patient) {
    const transaction = db.transaction(["prescriptions"], "readonly");
    const store = transaction.objectStore("prescriptions");
    const request = store.getAll();

    request.onsuccess = (event) => {
        const allPrescriptions = event.target.result;

        // Filter prescriptions by patient's NHS
        const patientPrescriptions = allPrescriptions.filter(prescription => prescription.plainNHS === patient.NHS);

        const medicinesList = document.getElementById("medicinesList");
        medicinesList.innerHTML = ""; // Clear existing medicines

        patientPrescriptions.forEach(prescription => {
            const listItem = document.createElement("li");
            listItem.textContent = `${secureDecrypt(prescription.medicine)} (Added on: ${new Date(prescription.timestamp).toLocaleString()})`;
            medicinesList.appendChild(listItem);
        });
    };

    request.onerror = (event) => {
        console.error("Failed to load medicines for patient:", event.target.error);
    };
}

function addPatientMedicine(patient) {
    const medicine = prompt(`Enter the medicine for ${patient.First} ${patient.Last}:`, "");
    if (!medicine) {
        alert("Medicine cannot be empty.");
        return;
    }

    const newPrescription = {
        NHS: secureEncrypt(patient.NHS), // Encrypt NHS number
        plainNHS: patient.NHS, // Add plain NHS for easy matching
        medicine: secureEncrypt(medicine), // Encrypt the medicine
        timestamp: new Date().toISOString() // Add a timestamp
    };

    const transaction = db.transaction(["prescriptions"], "readwrite");
    const store = transaction.objectStore("prescriptions");

    store.add(newPrescription);

    transaction.oncomplete = () => {
        alert("Medicine added successfully!");
        loadPatientMedicines(patient); // Reload medicines for the patient
    };

    transaction.onerror = (event) => {
        console.error("Failed to add medicine:", event.target.error);
        alert("Failed to add medicine. Please try again.");
    };
}

function addPatientNote(patient) {
    const note = prompt(`Enter a note for ${patient.First} ${patient.Last}:`, "");
    if (!note) {
        alert("Note cannot be empty.");
        return;
    }

    const newNote = {
        NHS: secureEncrypt(patient.NHS), // Encrypt NHS number
        plainNHS: patient.NHS, // Add plain NHS for easy matching
        note: secureEncrypt(note), // Encrypt the note
        timestamp: new Date().toISOString() // Add a timestamp
    };

    const transaction = db.transaction(["notes"], "readwrite");
    const store = transaction.objectStore("notes");

    store.add(newNote);

    transaction.oncomplete = () => {
        alert("Note added successfully!");
        loadPatientNotes(patient); // Reload notes for the patient
    };

    transaction.onerror = (event) => {
        console.error("Failed to add note:", event.target.error);
        alert("Failed to add note. Please try again.");
    };
}








function loadPatientInfo(user) {
    const patientInfo = document.getElementById("patientInfo");

    // Clear existing content
    patientInfo.innerHTML = "";

    // Create key-value pairs for display
    const infoMap = {
        "NHS": secureDecrypt(user.NHS),
        "Title": secureDecrypt(user.Title),
        "First Name": secureDecrypt(user.First),
        "Last Name": secureDecrypt(user.Last),
        "Date of Birth": secureDecrypt(user.DOB),
        "Gender": secureDecrypt(user.Gender),
        "Address": secureDecrypt(user.Address),
        "Email": secureDecrypt(user.Email),
        "Telephone": secureDecrypt(user.Telephone)
    };

    // Populate grid with key-value pairs
    Object.entries(infoMap).forEach(([key, value]) => {
        const labelDiv = document.createElement("div");
        labelDiv.textContent = key + ":";
        labelDiv.classList.add("label");

        const valueDiv = document.createElement("div");
        valueDiv.textContent = value || "N/A";
        valueDiv.classList.add("value");

        patientInfo.appendChild(labelDiv);
        patientInfo.appendChild(valueDiv);
    });
}



function secureEncrypt(plainText) {
    return CryptoJS.AES.encrypt(plainText, ENCRYPTION_KEY).toString();
}

function secureDecrypt(cipherText) {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error("Failed to decrypt text:", cipherText, error);
        return "Error";
    }
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

