/*alert("test");
// Variables: let name = "Brady";
// if (name === "Brady") { <--- == is called loose comparison, === is called strict comparison
//                         "10" == 10 is true, "10" === 10 is false , because loose compares values only.
//    alert(`${name}`); <-- String literals use backticks `` and ${} to insert variables
let nam = "Brady";
if (nam === "Brady") {
    alert(`${nam}`);
}
// loops are the same as C++, use let i instead of int i

// you do not need to prototype functions in JS
function addNumbers(a, b) {
    typeof  a; // typeof can be used to check data types
    if (typeof a !== "number" || typeof b !== "number") { // number, and NaN are data types in JS
        throw new Error("Parameters must be numbers");
    }
    else{
        return a + b; // this can be any data type
    }
}
// Bread and Butter of JS: Events and the DOM
// DOM = Document Object Model
// Events = user interactions that can be captured to run code
const button = document.getElementById("button1"); //every element in HTML is an object in the DOM
button.addEventListener("click", (e) => { // e is an optional event object that contains info about the event
    // this event is constantly listening for a click on button1
    button.style.color = "purple" // object.property
    button.style.backgroundColor = "yellow" // camelCase for multi-word properties
}); 
// everything has properties, methods, and events in the DOM
// you can add your own custom properties to objects that are not your own.
// can help with organization. 
// ??= is the Nullish coalescing assignment operator
let user = {
    name: "Brady"
};
user.age ??= 25; // if user.age is null or undefined, assign 25
console.log(user.age); // 25
// docunent fragments can be pinned to documents.
const fragment = new DocumentFragment();
const classTitleDiv = document.createElement("div"); // doesn't exist in the webpage, just in your JS
const classCreditsDiv = document.createElement("div");
classTitleDiv.textContent = "CSC1300";

// a fragment is a container of elements.

// FETCH API -> Request Json
const classJSON = 1; // placeholder for fetched JSON
let className = classJSON["className"]
for (classes in studentClasses){
    let classBox = document.createElement("div");
    let classBoxTitle = document.createElement("div");
    let className = classJSON["className"]
    classBoxTitle.textContent = className;
    classBox.appendChild(classBoxTitle); // append adds to the previous element, append child puts the div inside of the previous element.
    classBox.style.display = "flex"; // change your style to make flexbox
    // OR
    // classBox.className = "flexClass";
}

// could create an array of objects to hold multiple classes, which could be useful for searching for a particular class.
for (let i = 0; i < 10; i++) {
    classBox.className = `flexClass${i}`; // dynamic class names
}

let classAccordionMain = document.createElement("div");
classAccordionMain.className = "accordion";
let classAccordionItem = document.createElement("div");
classAccordionItem.className = "accordion-item";
classAccordionMain.appendChild(classAccordionItem);
fragment.appendChild(classAccordionMain);


async function getDegreeTemplate(url) {
    const response = await fetch(url).then((response) => response.json());
    degreeJSON = response;
}




*/

// I want a button that when clicked will create an Semester accordion
let semesterCounter = 0;

function addSemester(){
    if (semesterCounter === 8){
        return
    }

    let semesterAccordionItem = document.createElement("div");
    semesterAccordionItem.className = "accordion-item";
    semesterAccordionItem.id = "semester" + (semesterCounter + 1);
    semesters.appendChild(semesterAccordionItem);

    let semesterAccordionItemHeader = document.createElement("h2");
    semesterAccordionItemHeader.className = "accordion-header";
    semesterAccordionItem.appendChild(semesterAccordionItemHeader);
    
    let semesterButton = document.createElement("button");
    semesterButton.className = "accordion-button";
    semesterButton.type = "button";
    semesterButton.textContent = "Semester " + (semesterCounter + 1);
    semesterAccordionItemHeader.appendChild(semesterButton);
    
    //semesterButton.prop("data-bs-toggle", "collapse");
    //semesterButton.prop("data-bs-target", "collaspe" + semesterCounter);
    //semesterButton.prop()

    let semesterClasses = document.createElement("div");
    semesterClasses.id = "collapse" + (semesterCounter + 1);
    semesterAccordionItem.appendChild(semesterClasses)


    semesterCounter += 1;

}

// can use classList.add() to dynamically add classes to elements
function addClass(){

    let semesterClass = document.createElement("div");
    
}

let classCounter = 1;

function popUpAddClass(semesterCounter){
    
}