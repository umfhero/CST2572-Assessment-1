// Sample data array
const drugs = [
    { "id": 1, "Drug": "Nabumetone" },
    { "id": 2, "Drug": "Vanilla" },
    { "id": 3, "Drug": "atovaquone and proguanil hydrochloride" },
    { "id": 4, "Drug": "lorazepam" },
    { "id": 5, "Drug": "Aconitum napellus, Onion, Arnica montana, Antropa Belladonna, Solanum Dulcamara Top, Eupatorium Cannabinum Whole Flowering, Gelsemium Sempervirens Root" },
    { "id": 6, "Drug": "BETHANECHOL CHLORIDE" },
    { "id": 7, "Drug": "Hydrocodone Bitartrate and Acetaminophen" },
    { "id": 8, "Drug": "alprazolam" },
    { "id": 9, "Drug": "Acetaminophen, Dextromethorphan HBr, Doxylamine succinate, Phenylephrine HCl" },
    { "id": 10, "Drug": "Docusate Sodium and Senna" },
    { "id": 11, "Drug": "DROSERA, ARNICA MONTANA, BRYONIA, CETRARIA ISLANDICA, BELLADONNA, COCCUS CACTI, CORALLIUM RUBRUM, STANNUM METALLICUM, CHAMOMILLA, COFFEA CRUDA" },
    { "id": 12, "Drug": "Trazodone Hydrochloride" },
    { "id": 13, "Drug": "Chlordiazepoxide Hydrochloride" },
    { "id": 14, "Drug": "Trazodone Hydrochloride" },
    { "id": 15, "Drug": "Magnesium Hydroxide" },
    { "id": 16, "Drug": "Zinc Oxide" },
    { "id": 17, "Drug": "TOBRAMYCIN SULFATE" },
    { "id": 18, "Drug": "Atomoxetine hydrochloride" },
    { "id": 19, "Drug": "CAMPHOR, EUCALYPTUS OIL and MENTHOL" },
    { "id": 20, "Drug": "Diphenhydramine Hydrochloride" },
    { "id": 21, "Drug": "lamotrigine" },
    { "id": 22, "Drug": "Acetaminophen" },
    { "id": 23, "Drug": "polyethylene glycol" },
    { "id": 24, "Drug": "Hydralazine Hydrochloride" },
    { "id": 25, "Drug": "Ramipril" },
    { "id": 26, "Drug": "CAMPHOR (NATURAL), MENTHOL,METHYL SALICYLATE" },
    { "id": 27, "Drug": "Menthol" },
    { "id": 28, "Drug": "Gabapentin" },
    { "id": 29, "Drug": "Fexofenadine HCl" },
    { "id": 30, "Drug": "Famotidine" },
    { "id": 31, "Drug": "Galantamine hydrobromide" },
    { "id": 32, "Drug": "RISPERIDONE" },
    { "id": 33, "Drug": "Amlodipine Besylate" },
    { "id": 34, "Drug": "OCTINOXATE, OCTISALATE, OXYBENZONE, OCTOCRYLENE, and AVOBENZONE" },
    { "id": 35, "Drug": "Labetalol Hydrochloride" },
    { "id": 36, "Drug": "Lovastatin" },
    { "id": 37, "Drug": "Ethyl Alcohol" },
    { "id": 38, "Drug": "Bupropion Hydrochloride" },
    { "id": 39, "Drug": "OXYBENZONE, AVOBENZONE, OCTOCRYLENE" },
    { "id": 40, "Drug": "Salicylic Acid" }
];

// Function to display the list of drugs
function displayDrugs() {
    drugs.forEach(drug => {
        console.log(`ID: ${drug.id}, Drug: ${drug.Drug}`);
    });
}

// Function to search for a drug by name
function searchDrug(drugName) {
    const result = drugs.find(drug => drug.Drug.toLowerCase() === drugName.toLowerCase());
    if (result) {
        console.log(`Found: ID: ${result.id}, Drug: ${result.Drug}`);
    } else {
        console.log(`Drug not found: ${drugName}`);
    }
}

// Function to list unique drugs, ignoring case
function listUniqueDrugs() {
    const uniqueDrugs = {};
    drugs.forEach(drug => {
        const lowerCaseDrug = drug.Drug.toLowerCase();
        if (!uniqueDrugs[lowerCaseDrug]) {
            uniqueDrugs[lowerCaseDrug] = drug;
        }
    });

    Object.values(uniqueDrugs).forEach(drug => {
        console.log(`ID: ${drug.id}, Drug: ${drug.Drug}`);
    });
}

// Example usage:
console.log("All drugs:");
displayDrugs();

console.log("\nSearch for 'acetaminophen':");
searchDrug('acetaminophen');

console.log("\nUnique drugs:");
listUniqueDrugs();
