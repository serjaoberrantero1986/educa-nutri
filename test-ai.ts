import fetch from "node-fetch";

async function run() {
  const userData = {
    sex: "male",
    age: 30,
    weight: 80,
    height: 180,
    activityLevel: "moderate",
    goal: "hypertrophy",
    exerciseCategory: "force",
    exerciseType: "Musculação",
    frequency: 4,
    duration: 60,
    waist: 85,
    neck: 38,
    hip: 95,
    biceps: 35,
    peitoral: 100,
    coxas: 55,
    knowsBodyFat: false,
    customBodyFat: 15,
  };

  const targetCalories = 2800;
  const targetMacros = { protein: 160, carbs: 320, fat: 80 };

  try {
    const res = await fetch("http://localhost:3000/api/ai/generate-diet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userData,
        targetCalories,
        targetMacros,
        customMeals: []
      })
    });
    
    console.log("Status Code:", res.status);
    const json = await res.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Test Error:", err);
  }
}

run();
