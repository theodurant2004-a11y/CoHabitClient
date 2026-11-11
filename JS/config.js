// API base URL: local Tomcat when the front runs on Five Server, Coolify otherwise
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8080/CoHabitAPI/api"
    : "https://jftcivmmb3b6ks2jwnsdq1mq.dev20.woogma.com/CoHabitAPI/api";