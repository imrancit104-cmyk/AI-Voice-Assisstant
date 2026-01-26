const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
let output = document.getElementById('output');
let aiActive = document.getElementById('aiactive');
let core = document.querySelector('.core');
const rings = document.querySelectorAll('.ring');
let isActive = false;
let controller;
const endSound = new Audio('endsound.mp3');
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.continuous = true;
const GROQ_API_KEY = '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';
async function getGroqResponse(userText) {
    try {
        controller = new AbortController();
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a helpful assistant. Keep your responses concise and suitable for voice output." },
                    { role: "user", content: userText }
                ]
            })
        });
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            return "I'm sorry, I couldn't process that request.";
        }
    } catch (error) {
        return "There was an error connecting to the assistant service.";
    }
}

startBtn.addEventListener('click', () => {
    if (!isActive) {
        isActive = true;
        core.style.backgroundColor='#8fefff'
        core.style.boxShadow='0 0 2rem #8fefff, inset 0 0 1.5625rem #8fefff';
        aiActive.textContent = "ARIM Assistant Active";
        status.textContent = "Assistant is listening...";
        startBtn.disabled = true;
        rings.forEach(r => r.classList.remove('ring-error','pulse2'));
        rings.forEach(r => r.classList.add('pulse'));

        core.classList.add('core-glow');
        let testing = new SpeechSynthesisUtterance('Greetings, I am your Arim AI assistant. How can I assist you today?');
        testing.lang = 'en-US';
        speechSynthesis.speak(testing);

        testing.onend = () => {
            recognition.start(); 
        };
    }
});


stopBtn.addEventListener('click', () => {
    if (isActive) {
        isActive = false;
        aiActive.textContent = "ARIM Assistant Disabled";
        output.innerHTML = '';
        if (controller) {
            controller.abort();
            controller = null;
        }
        recognition.stop();
        speechSynthesis.cancel();
        endSound.play();
        status.textContent = "Assistant stopped.";
        startBtn.disabled = false;

        rings.forEach(r => r.classList.remove('pulse'));
    }
});
recognition.onend = () => {
    if (isActive) {
        recognition.start();
    }
};

recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') {
        if (isActive) recognition.start();
    }
    if (event.error === 'network') {
        status.textContent = 'Please check your Internet connection and then try again by using Active button or refresh.';
        isActive = false;
        aiActive.textContent = "Network Connection Lost!";
        core.style.backgroundColor='yellow'
        core.style.boxShadow='0px 0px 0px'
        recognition.stop();
        speechSynthesis.cancel();
        endSound.play();
        startBtn.disabled = false;
        rings.forEach(r => r.classList.remove('pulse'));
        rings.forEach(r => r.classList.add('ring-error','pulse2'));
     
    }
};

recognition.onresult = async (event) => {
    const userText = event.results[0][0].transcript.toLowerCase();
    status.textContent = `You asked: "${userText}" | Thinking...`;
    recognition.stop();
    const answer = await getGroqResponse(userText);
    if (!answer || !isActive) 
        return;
    status.textContent = `You asked: "${userText}"`;
    output.innerHTML = answer;
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
    utterance.onend = () => {
        if (isActive) {
            recognition.start(); 
        }
    };
};

