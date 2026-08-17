const BOT_CONFIG = {
  mood: {
    title: "Mood Chatbot",
    icon: "😊",
    description:
      "Ask about PMS, PMDD, anxiety, sadness, irritability, emotional changes, stress, and mood patterns.",
    file: "mood_fixed.json",
    examples: [
      "Why am I so emotional before my period?",
      "Are mood swings normal during my period?",
      "What is PMDD?"
    ]
  },

  pain: {
    title: "Pain Chatbot",
    icon: "🩹",
    description:
      "Ask about cramps, headaches, back pain, nausea, pain relief, and when pain may need medical attention.",
    file: "pain_fixed.json",
    examples: [
      "Why are my cramps worse at night?",
      "How can I relieve period pain at home?",
      "When is period pain more serious than normal?"
    ]
  },

  flow: {
    title: "Period Flow Chatbot",
    icon: "💧",
    description:
      "Ask about heavy or light flow, irregular periods, bleeding patterns, cycle timing, and tracking.",
    file: "flow.json",
    examples: [
      "How much is too much period flow?",
      "What can cause light periods?",
      "When should I see a doctor for heavy bleeding?"
    ]
  },

  changes: {
    title: "Physical Changes Chatbot",
    icon: "🌸",
    description:
      "Ask about acne, bloating, fatigue, digestion, appetite, body aches, and other physical changes.",
    file: "changes.json",
    examples: [
      "Why do I get acne before my period?",
      "Why do I feel bloated before my period?",
      "Why do I feel exhausted before my period?"
    ]
  }
};


let currentBot = null;
let currentData = null;


/* -------------------------
   TEXT MATCHING
------------------------- */

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function getWords(text) {
  const stopWords = [
    "a", "an", "the", "i", "me", "my",
    "you", "your", "is", "are", "am",
    "was", "were", "do", "does", "did",
    "can", "could", "should", "would",
    "will", "what", "when", "where",
    "why", "how", "who", "which",
    "to", "of", "for", "in", "on",
    "at", "and", "or", "with", "from",
    "it", "this", "that", "be"
  ];

  return normalize(text)
    .split(" ")
    .filter(word =>
      word.length > 0 &&
      !stopWords.includes(word)
    );
}


function similarity(textA, textB) {

  const a = normalize(textA);
  const b = normalize(textB);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (a.includes(b) || b.includes(a)) {

    const shorter =
      Math.min(a.length, b.length);

    const longer =
      Math.max(a.length, b.length);

    return 0.82 +
      0.12 * (shorter / longer);
  }


  const wordsA = getWords(a);
  const wordsB = getWords(b);

  if (
    wordsA.length === 0 ||
    wordsB.length === 0
  ) {
    return 0;
  }


  let matches = 0;

  wordsA.forEach(word => {

    if (wordsB.includes(word)) {
      matches++;
    }

  });


  const uniqueWords =
    new Set([...wordsA, ...wordsB]);

  return 0.72 *
    (matches / uniqueWords.size);
}


/* -------------------------
   FIND BEST QUESTION
------------------------- */

function findAnswer(message) {

  if (
    !currentData ||
    !currentData.qa
  ) {
    return null;
  }


  let bestQuestion = null;
  let bestScore = 0;


  currentData.qa.forEach(item => {

    let score = 0;


    if (item.triggers) {

      item.triggers.forEach(trigger => {

        score = Math.max(
          score,
          similarity(message, trigger)
        );

      });

    }


    if (item.question) {

      score = Math.max(
        score,
        similarity(
          message,
          item.question
        ) * 0.96
      );

    }


    if (score > bestScore) {

      bestScore = score;
      bestQuestion = item;

    }

  });


  if (
    !bestQuestion ||
    bestScore < 0.42
  ) {
    return null;
  }


  return {
    item: bestQuestion,
    score: bestScore
  };
}


/* -------------------------
   CHAT MESSAGES
------------------------- */

function addMessage(type, text) {

  const messages =
    document.getElementById("messages");


  const row =
    document.createElement("div");


  row.className =
    "msg " + type;


  const bubble =
    document.createElement("div");


  bubble.className =
    "bubble";


  bubble.textContent = text;


  row.appendChild(bubble);

  messages.appendChild(row);


  messages.scrollTop =
    messages.scrollHeight;
}


/* -------------------------
   LOAD JSON
------------------------- */

async function loadBotData(botKey) {

  const config =
    BOT_CONFIG[botKey];


  const response =
    await fetch(config.file);


  if (!response.ok) {

    throw new Error(
      "Could not load " +
      config.file
    );

  }


  return await response.json();
}


/* -------------------------
   OPEN CHATBOT
------------------------- */

async function openBot(botKey) {

  console.log(
    "Opening chatbot:",
    botKey
  );


  currentBot = botKey;

  const config =
    BOT_CONFIG[botKey];


  document
    .getElementById("chooser")
    .classList
    .add("hidden");


  document
    .getElementById("chat")
    .classList
    .remove("hidden");


  document
    .getElementById("sideIcon")
    .textContent =
    config.icon;


  document
    .getElementById("sideTitle")
    .textContent =
    config.title;


  document
    .getElementById("sideDesc")
    .textContent =
    config.description;


  document
    .getElementById("chatTitle")
    .textContent =
    "Cycle Care · " +
    config.title;


  document
    .getElementById("status")
    .textContent =
    "Loading questions...";


  document
    .getElementById("messages")
    .innerHTML = "";


  try {

    currentData =
      await loadBotData(botKey);


    document
      .getElementById("status")
      .textContent =
      currentData.qa.length +
      " questions available";


    document
      .getElementById("disclaimer")
      .textContent =
      currentData.global_disclaimer || "";


    addMessage(
      "bot",
      "Hi! I'm the " +
      config.title +
      " in Cycle Care. Ask me a question."
    );


    createExamples(config);


  }

  catch (error) {

    console.error(error);


    document
      .getElementById("status")
      .textContent =
      "Error loading questions";


    addMessage(
      "bot",
      "I couldn't load this chatbot's question library."
    );

  }

}


/* -------------------------
   EXAMPLE QUESTIONS
------------------------- */

function createExamples(config) {

  const container =
    document.getElementById("examples");


  container.innerHTML = "";


  config.examples.forEach(example => {

    const button =
      document.createElement("button");


    button.type =
      "button";


    button.textContent =
      example;


    button.addEventListener(
      "click",
      function () {

        document
          .getElementById("messageInput")
          .value =
          example;

      }
    );


    container.appendChild(
      button
    );

  });

}


/* -------------------------
   SEND MESSAGE
------------------------- */

function sendMessage(event) {

  event.preventDefault();


  const input =
    document.getElementById(
      "messageInput"
    );


  const message =
    input.value.trim();


  if (!message) {
    return;
  }


  addMessage(
    "user",
    message
  );


  input.value = "";


  const result =
    findAnswer(message);


  if (result) {

    addMessage(
      "bot",
      result.item.answer
    );

    return;
  }


  if (
    currentData &&
    currentData.fallback
  ) {

    addMessage(
      "bot",
      currentData.fallback.message
    );

  }

  else {

    addMessage(
      "bot",
      "I'm not sure I understood that question. Try asking it another way."
    );

  }

}


/* -------------------------
   RETURN HOME
------------------------- */

function showHome() {

  document
    .getElementById("chat")
    .classList
    .add("hidden");


  document
    .getElementById("chooser")
    .classList
    .remove("hidden");


  currentBot = null;
  currentData = null;

}


/* -------------------------
   CLEAR CHAT
------------------------- */

function clearChat() {

  document
    .getElementById("messages")
    .innerHTML = "";


  if (currentBot) {

    addMessage(
      "bot",
      "Hi! I'm the " +
      BOT_CONFIG[currentBot].title +
      " in Cycle Care. Ask me a question."
    );

  }

}


/* -------------------------
   START WEBSITE
------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "Cycle Care JavaScript loaded successfully."
    );


    const chatbotButtons =
      document.querySelectorAll(
        "[data-bot]"
      );


    console.log(
      "Chatbot buttons found:",
      chatbotButtons.length
    );


    chatbotButtons.forEach(
      button => {

        button.addEventListener(
          "click",
          function () {

            const bot =
              button.getAttribute(
                "data-bot"
              );


            openBot(bot);

          }
        );

      }
    );


    document
      .getElementById("chatForm")
      .addEventListener(
        "submit",
        sendMessage
      );


    document
      .getElementById("backBtn")
      .addEventListener(
        "click",
        showHome
      );


    document
      .getElementById("chooseBtn")
      .addEventListener(
        "click",
        showHome
      );


    document
      .getElementById("clearBtn")
      .addEventListener(
        "click",
        clearChat
      );

  }
);
