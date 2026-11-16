
const previousWeekButton =
    document.querySelector<HTMLButtonElement>("#previous-week");

const nextWeekButton =
    document.querySelector<HTMLButtonElement>("#next-week");

const currentWeekHeading =
    document.querySelector<HTMLElement>("#current-week");

const dayHeadings =
    document.querySelectorAll<HTMLElement>(".task-column h3");

// Start with today's date
const today = new Date();

// Find Monday of the current week
const currentMonday = new Date(today);

const dayOfWeek = currentMonday.getDay();

const daysSinceMonday = (dayOfWeek + 6) % 7;

currentMonday.setDate(
    currentMonday.getDate() - daysSinceMonday
);

currentMonday.setHours(0, 0, 0, 0);

// The week currently being displayed
let displayedMonday = new Date(currentMonday);

function displayWeek(): void {
    if (!currentWeekHeading) {
        return;
    }

    // Sunday is six days after Monday
    const sunday = new Date(displayedMonday);

    sunday.setDate(sunday.getDate() + 6);

    const dateOptions: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric"
    };

    const startDate =
        displayedMonday.toLocaleDateString("en-US", dateOptions);

    const endDate =
        sunday.toLocaleDateString("en-US", {
            ...dateOptions,
            year: "numeric"
        });

    currentWeekHeading.textContent =
        `${startDate} - ${endDate}`;

    // Display the date under each weekday
    dayHeadings.forEach((heading, index) => {
        const date = new Date(displayedMonday);

        date.setDate(date.getDate() + index);

        const dayName = date.toLocaleDateString("en-US", {
            weekday: "long"
        });

        const formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });

        
            heading.replaceChildren();

            const dayText = document.createElement("span");
            dayText.className = "planner-day-name";
            dayText.textContent = dayName;

            const dateText = document.createElement("span");
            dateText.className = "planner-day-date";
            dateText.textContent = formattedDate.replace(
            /^([A-Za-z]{3}) /,
             "$1. "
);

heading.append(dayText, dateText);

    });
}

// Go back one week
previousWeekButton?.addEventListener("click", () => {
    displayedMonday.setDate(
        displayedMonday.getDate() - 7
    );

    displayWeek();
});

// Go forward one week
nextWeekButton?.addEventListener("click", () => {
    displayedMonday.setDate(
        displayedMonday.getDate() + 7
    );

    displayWeek();
});

// Display the current week when the page loads
displayWeek();

export {};
