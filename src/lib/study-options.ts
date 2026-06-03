export const EDUCATION_LEVELS = ["School", "College", "University", "Other"] as const;
export const LANGUAGES = ["English", "Urdu", "Hindi", "Arabic", "Other"] as const;
export const STUDY_GOALS = [
  "Exam Preparation",
  "Daily Learning",
  "Skill Development",
  "Assignment Support",
  "Competitive Exams",
  "Research",
] as const;
export const SUBJECTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Business Studies",
  "Statistics",
  "Economics",
  "Other",
] as const;

export const MOTIVATIONAL_QUOTES = [
  "Small progress every day adds up to big results.",
  "Consistency creates success.",
  "Today's effort becomes tomorrow's achievement.",
  "One focused study session can change everything.",
  "Discipline is choosing what you want most over what you want now.",
  "You don't have to be perfect — just consistent.",
  "Every expert was once a beginner.",
];

export function dailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
}
