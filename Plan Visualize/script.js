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

// Working add semester function. Should be altered to inject JSON information.
function addSemester(){
    if (semesterCounter === 8){
        return
    }

    const degreePlanAccordion = document.getElementById("degreePlan");

    const semesterAccordionHtml = `
    <!--Semester ${semesterCounter+1} Accordion-->
        <div class="accordion-item">
            <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${semesterCounter+1}" aria-expanded="false" aria-controls="collapse${semesterCounter+1}">
                Semester ${semesterCounter+1}
            </button>
            </h2>
            <div id="collapse${semesterCounter+1}" class="accordion-collapse collapse" data-bs-parent="#degreePlan">
                <div class="accordion-body position-relative">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${semesterCounter+1}A" aria-expanded="false" aria-controls="collapse${semesterCounter+1}A">
                            CSC 1300 - Intro to Prob Solving/Computer Programming
                            </button>
                        </h2>
                        <div id="collapse${semesterCounter+1}A" class="accordion-collapse collapse" data-bs-parent="#collapse${semesterCounter+1}">
                            <div class="accordion-body">
                                <p>Credit Hours: 4</p>
                                <hr>
                                <p>Prerequisites: CSC 1200 or MATH 1845 or MATH 1910. MATH 1845 or MATH 1910 may be taken concurrently.</p>
                                <hr>
                                <p>Class Description:  Digital computers; problem solving and algorithm development; programming is introduced using a procedural approach, but classes and object-orientation are introduced; design and testing are emphasized. Students complete a series of weekly laboratory exercises for developing proficiency in problem solving and computer programming.</p>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${semesterCounter+1}B" aria-expanded="false" aria-controls="collapse${semesterCounter+1}B">
                            MATH 1910 - Calculus I
                            </button>
                        </h2>
                        <div id="collapse${semesterCounter+1}B" class="accordion-collapse collapse" data-bs-parent="#collapse${semesterCounter+1}">
                            <div class="accordion-body">
                                <p>Credits: 4</p>
                                <hr>
                                <p>Prerequisite: ACT mathematics score of 27 or above and four years of high school mathematics, including algebra, geometry, trigonometry, and advanced or pre-calculus mathematics, or special permission of the Mathematics Department; or C or better in MATH 1730; or C or better in MATH 1720 and MATH 1710 or equivalent.</p>
                                <hr>
                                <p>Description: Limits, continuity, derivatives and integrals of functions of one variable. Applications of differentiation and introduction to the definite integral.</p>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item" >
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${semesterCounter+1}C" aria-expanded="false" aria-controls="collapse${semesterCounter+1}C"color="red">
                            ENGL 1010 - English Composition I
                            </button>
                        </h2>
                        <div id="collapse${semesterCounter+1}C" class="accordion-collapse collapse" data-bs-parent="#collapse${semesterCounter+1}">
                            <div class="accordion-body">
                                <p>Credits: 3</p>
                                <hr>
                                <p>Prerequisites: None</p>
                                <hr>
                                <p>Class Description: Introduces students to expressive, expository and persuasive writing. Assignments are based on personal experience and research. Student must earn a grade of C or better to pass.</p>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${semesterCounter+1}D" aria-expanded="false" aria-controls="collapse${semesterCounter+1}D">
                            CSC 1020 - Connections to Computing
                            </button>
                        </h2>
                        <div id="collapse${semesterCounter+1}D" class="accordion-collapse collapse" data-bs-parent="#collapse${semesterCounter+1}">
                            <div class="accordion-body">
                                <p>Credits: 1</p>
                                <hr>
                                <p>Prerequisites: None</p>
                                <hr>
                                <p>Description: Engages the student in meaningful academic and non-academic, out-of-the classroom activities involving computer. Emphasizes critical thinking in the formation of academic and social goals and support groups and in self-management and study skills. Introduces communication and teamwork skills.</p>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${semesterCounter+1}E" aria-expanded="false" aria-controls="collapse${semesterCounter+1}E">
                            HIST 2010 - Early United States History
                            </button>
                        </h2>
                        <div id="collapse${semesterCounter+1}E" class="accordion-collapse collapse" data-bs-parent="#collapse${semesterCounter+1}">
                            <div class="accordion-body">
                                <p>Credits: 3</p>
                                <hr>
                                <p>Prerequisites: None</p>
                                <hr>
                                <p>Description: Colonial heritage; Independence; Nationalism and Expansion; Rise of Democracy, Reform and Sectionalism; and Civil War and Reconstruction.</p>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex flex-column align-items-end justify-content-end">
                        <button class="btn btn-primary" onclick="popUpAddClass(semesterCounter)">
                            + Add Class
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    degreePlanAccordion.insertAdjacentHTML('beforeend', semesterAccordionHtml);
    semesterCounter += 1;

}

// can use classList.add() to dynamically add classes to elements
function addClass(semester){

    const html = `
    
    `;



    
    
}

let jimmy = `
<div> hello </div>
`;