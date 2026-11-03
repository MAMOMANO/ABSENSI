function updateTime() {
  const now = new Date();

  const timeString = now.toLocaleTimeString("id-ID");
  const dateString = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeElement = document.getElementById("currentTime");
  const dateElement = document.getElementById("todayDate");
  const currentDateElement = document.getElementById("currentDate");

  if (timeElement) timeElement.textContent = timeString;
  if (dateElement) dateElement.textContent = dateString.split(",")[1].trim();
  if (currentDateElement) currentDateElement.textContent = dateString;
}

setInterval(updateTime, 1000);
updateTime();
