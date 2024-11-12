// Load and parse the JSON file
fetch('/mnt/data/patients.json')
    .then(response => response.json())
    .then(data => {
        const patients = data;
        console.log('Patients loaded:', patients);

        // Example: Display all patient names
        displayPatientNames(patients);

        // Example: Find a patient by NHS number
        const nhsNumber = "6538586104";
        const patient = findPatientByNHS(patients, nhsNumber);
        if (patient) {
            console.log('Patient found:', patient);
        } else {
            console.log(`Patient with NHS number ${nhsNumber} not found.`);
        }

        // Example: Get patients over a specific age
        const ageLimit = 60;
        const seniorPatients = filterPatientsByAge(patients, ageLimit);
        console.log(`Patients over ${ageLimit} years old:`, seniorPatients);
    })
    .catch(error => console.error('Error loading patient data:', error));

// Helper functions

// Display all patient names
function displayPatientNames(patients) {
    patients.forEach(patient => {
        console.log(`${patient.First} ${patient.Last}`);
    });
}

// Find a patient by NHS number
function findPatientByNHS(patients, nhsNumber) {
    return patients.find(patient => patient.NHS === nhsNumber);
}

// Filter patients by age
function filterPatientsByAge(patients, minAge) {
    const currentYear = new Date().getFullYear();
    return patients.filter(patient => {
        const birthYear = new Date(patient.DOB.split('/').reverse().join('-')).getFullYear();
        const age = currentYear - birthYear;
        return age >= minAge;
    });
}
