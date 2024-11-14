let db;
const DATABASE_NAME = "surgeryDatabase";
const ENCRYPTION_KEY = "secure-key";

function initializeDatabase() {
    const request = indexedDB.open(DATABASE_NAME, 1);

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

        console.info("Database schema created with object stores");
    };
}

function loadAndStoreData() {
    fetch('/admin.json')
        .then(response => response.json())
        .then(data => {
            const encryptedData = data.map(user => ({
                ...user,
                password: secureEncrypt(user.password)
            }));
            storeData("administrators", encryptedData);
        })
        .catch(error => console.error("Failed to retrieve admin data:", error));

    fetch('/doctor.json')
        .then(response => response.json())
        .then(data => {
            const encryptedData = data.map(user => ({
                ...user,
                password: secureEncrypt(user.password)
            }));
            storeData("doctors", encryptedData);
        })
        .catch(error => console.error("Failed to retrieve doctor data:", error));

    fetch('/people.json')
        .then(response => response.json())
        .then(data => storeData("patients", data))
        .catch(error => console.error("Failed to retrieve patient data:", error));

    fetch('/medicine.json')
        .then(response => response.json())
        .then(data => storeData("medications", data))
        .catch(error => console.error("Failed to retrieve medication data:", error));
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
            const decryptedPassword = accountType === "Admin" ? secureDecrypt(user.password) : user.password;
            if (decryptedPassword === password) {
                displaySection(accountType);
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

function displaySection(role) {
    document.getElementById("logins-screen").style.display = "none";
    document.getElementById("tabs").style.display = "none";

    document.getElementById("Patient").style.display = role === "Patient" ? "block" : "none";
    document.getElementById("Admin").style.display = role === "Admin" ? "block" : "none";
    document.getElementById("Doctor").style.display = role === "Doctor" ? "block" : "none";
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
