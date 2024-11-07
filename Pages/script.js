let db;
const DATABASE_NAME = "surgeryDatabase";
const ENCRYPTION_KEY = "secure-key"; // Ensure this key is securely stored

// Initialize the database
function initializeDatabase() {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onerror = (event) => {
        console.error("Database initialization failed:", event.target.error);
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.info("Database connected");
        loadAndStoreData(); // Populate database upon opening
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;

        // Define object stores for system roles
        db.createObjectStore("administrators", { keyPath: "username" });
        db.createObjectStore("clientData", { keyPath: "id" });
        db.createObjectStore("medication", { keyPath: "id" });

        console.info("Database schema created");
    };
}

// Fetch JSON data from external URLs and store in IndexedDB
function loadAndStoreData() {
    // Fetch and store admin data
    fetch('https://simulacra.uk/CST2572/admin.json')
        .then(response => response.json())
        .then(data => {
            console.log("Fetched admin data:", data);
            storeData("administrators", data.map(user => ({
                ...user,
                password: secureEncrypt(user.password) // Encrypt passwords before storing
            })));
        })
        .catch(error => console.error("Failed to retrieve admin data:", error));

    // Fetch and store patient data
    fetch('https://simulacra.uk/CST2572/people.json')
        .then(response => response.json())
        .then(data => {
            console.log("Fetched patient data:", data);
            storeData("clientData", data);
        })
        .catch(error => console.error("Failed to retrieve patient data:", error));

    // Fetch and store doctor data
    fetch('https://simulacra.uk/CST2572/doctor.json')
        .then(response => response.json())
        .then(data => {
            console.log("Fetched doctor data:", data);
            storeData("clientData", data); // Assuming doctors are stored in the same store as patients
        })
        .catch(error => console.error("Failed to retrieve doctor data:", error));

    // Fetch and store medicine data
    fetch('https://simulacra.uk/CST2572/medicine.json')
        .then(response => response.json())
        .then(data => {
            console.log("Fetched medicine data:", data);
            storeData("medication", data);
        })
        .catch(error => console.error("Failed to retrieve medication data:", error));
}

// Store JSON data in IndexedDB and log each record
function storeData(storeName, records) {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    records.forEach(record => {
        console.log(`Storing record in ${storeName}:`, record);
        store.put(record);
    });

    transaction.oncomplete = () => {
        console.log(`Data stored successfully in ${storeName}`);
        inspectStore(storeName); // Log stored records after each store completes
    };

    transaction.onerror = (event) => {
        console.error(`Failed to store data in ${storeName}:`, event.target.error);
    };
}

// Inspect and log all records in a specific store
function inspectStore(storeName) {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);

    const request = store.openCursor();
    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            console.log(`Record in ${storeName}:`, cursor.value);
            cursor.continue();
        } else {
            console.log(`No more records in ${storeName}`);
        }
    };

    request.onerror = (event) => {
        console.error(`Error inspecting store ${storeName}:`, event.target.error);
    };
}

// Encrypt and decrypt utilities
function secureEncrypt(plainText) {
    return CryptoJS.AES.encrypt(plainText, ENCRYPTION_KEY).toString();
}

function secureDecrypt(cipherText) {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

// Authentication function
function authenticate() {
    const accountType = document.getElementById("accountType").value;
    const username = sanitize(document.getElementById("username").value);
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");

    errorMessage.textContent = ""; // Reset error message
    console.log(`Authenticating user: ${username}, account type: ${accountType}`);

    if (accountType === "Admin") {
        const transaction = db.transaction(["administrators"], "readonly");
        const store = transaction.objectStore("administrators");
        const request = store.get(username);

        request.onsuccess = (event) => {
            const admin = event.target.result;
            console.log("Retrieved admin record:", admin);

            if (admin) {
                const decryptedPassword = secureDecrypt(admin.password);
                console.log(`Decrypted password for ${username}:`, decryptedPassword);

                if (decryptedPassword === password) {
                    displaySection("Admin");
                } else {
                    errorMessage.textContent = "Password mismatch.";
                    console.warn("Password mismatch for user:", username);
                }
            } else {
                errorMessage.textContent = "Admin not found.";
                console.warn("Admin not found:", username);
            }
        };

        request.onerror = (event) => {
            errorMessage.textContent = "Error retrieving admin data.";
            console.error("Error retrieving admin data for user:", username, event);
        };
    } else {
        errorMessage.textContent = `Login for ${accountType} is not implemented.`;
        console.warn(`Login for ${accountType} not implemented.`);
    }
}

// Display section based on account type
function displaySection(role) {
    document.getElementById("logins-screen").style.display = "none";
    document.getElementById("tabs").style.display = "none";

    document.getElementById("Patient").style.display = role === "Patient" ? "block" : "none";
    document.getElementById("Admin").style.display = role === "Admin" ? "block" : "none";
    document.getElementById("Doctor").style.display = role === "Doctor" ? "block" : "none";
}

// Logout function to reset view
function resetLogin() {
    document.getElementById("logins-screen").style.display = "block";
    document.getElementById("tabs").style.display = "none";

    Array.from(document.getElementsByClassName("tab-content")).forEach(content => content.style.display = "none");

    document.getElementById("account-type").textContent = "";
    document.getElementById("error-message").textContent = "";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}

// Utility functions
function sanitize(input) {
    const element = document.createElement('div');
    element.innerText = input;
    return element.innerHTML;
}

// Initialize the database on load
initializeDatabase();
