const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
let output = document.getElementById('output');
let aiActive = document.getElementById('aiactive');
let core = document.querySelector('.core');
const rings = document.querySelectorAll('.ring');
let isActive = false;
let isSpeaking = false;
let isProcessingResponse = false;
let controller;
let restartTimeout;
let speechTimeout;
let interimTranscript = '';

const startSound = new Audio('startsound.mp3');
const endSound = new Audio('endsound.mp3');
const errorSound = new Audio('errorsound.mp3');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = true;
recognition.maxAlternatives = 1;

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

function resetSpeechTimeout() {
    if (speechTimeout) clearTimeout(speechTimeout);
    speechTimeout = setTimeout(() => {
        if (isActive && !isSpeaking && !isProcessingResponse && interimTranscript) {
            processFinalTranscript(interimTranscript);
        }
    }, 1500);
}

async function processFinalTranscript(finalText) {
    if (!finalText.trim() || isSpeaking || isProcessingResponse) return;
    
    isProcessingResponse = true;
    recognition.stop();
    
    if (speechTimeout) clearTimeout(speechTimeout);
    
    status.textContent = `You asked: "${finalText}" | Thinking...`;
    
    const answer = await getGroqResponse(finalText);
    
    if (!answer || !isActive) {
        isProcessingResponse = false;
        interimTranscript = '';
        if (isActive && !isSpeaking) {
            setTimeout(() => recognition.start(), 500);
        }
        return;
    }
    
    status.textContent = `You asked: "${finalText}"`;
    output.innerHTML = answer;
    isSpeaking = true;
    
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    utterance.onend = () => {
        isSpeaking = false;
        isProcessingResponse = false;
        interimTranscript = '';
        
        setTimeout(() => {
            if (isActive && !isSpeaking && !isProcessingResponse) {
                recognition.start();
            }
        }, 1000);
    };
    
    utterance.onerror = () => {
        isSpeaking = false;
        isProcessingResponse = false;
        if (isActive) {
            setTimeout(() => recognition.start(), 1000);
        }
    };
    
    speechSynthesis.speak(utterance);
}

startBtn.addEventListener('click', () => {
    if (!isActive) {
        if (recognition && isSpeaking) {
            speechSynthesis.cancel();
        }
        if (restartTimeout) clearTimeout(restartTimeout);
        if (speechTimeout) clearTimeout(speechTimeout);
        
        isActive = true;
        isSpeaking = false;
        isProcessingResponse = false;
        interimTranscript = '';
        
        startSound.play();
        core.classList.remove('core-wifi');
        rings.forEach(r => r.classList.add('pulse'));
        rings.forEach(r => r.classList.remove('pulse2'));
        core.style.top = '40.2%';
        core.style.boxShadow = '0 0 2rem #8fefff, inset 0 0 1.5625rem #8fefff';
        core.style.backgroundColor = '#8fefff';
        aiActive.style.color = '#8fefff';
        aiActive.textContent = "ARIM Assistant Active";
        status.textContent = "Assistant is listening...";
        startBtn.disabled = true;
        
        setTimeout(() => {
            let testing = new SpeechSynthesisUtterance('Greetings, I am your Arim AI assistant. How can I assist you today?');
            testing.lang = 'en-US';
            
            testing.onend = () => {
                setTimeout(() => {
                    if (isActive && !isSpeaking) {
                        recognition.start();
                    }
                }, 500);
            };
            
            speechSynthesis.speak(testing);
        }, 1000);
    }
});

stopBtn.addEventListener('click', () => {
    if (isActive) {
        isActive = false;
        isSpeaking = false;
        isProcessingResponse = false;
        interimTranscript = '';
        
        aiActive.textContent = "ARIM Assistant Disabled";
        output.innerHTML = '';
        
        if (controller) {
            controller.abort();
            controller = null;
        }
        
        if (restartTimeout) clearTimeout(restartTimeout);
        if (speechTimeout) clearTimeout(speechTimeout);
        
        recognition.stop();
        speechSynthesis.cancel();
        endSound.play();
        status.textContent = "Assistant stopped.";
        startBtn.disabled = false;
        rings.forEach(r => r.classList.remove('pulse'));
    }
});

recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
        if (isActive && !isSpeaking && !isProcessingResponse) {
            setTimeout(() => recognition.start(), 500);
        }
    }
    if (event.error === 'network') {
        status.textContent = 'Please check your Internet connection and then try again by using Active button or refresh.';
        isActive = false;
        isSpeaking = false;
        isProcessingResponse = false;
        aiActive.textContent = "Network Connection Loose!";
        aiActive.style.color = 'rgb(235, 154, 83)';
        rings.forEach(r => r.classList.remove('pulse'));
        rings.forEach(r => r.classList.add('pulse2'));
        core.classList.add('core-wifi');
        core.style.backgroundColor = 'rgb(255, 119, 0)';
        core.style.boxShadow = '0 0 0';
        core.style.top = '79%';
        recognition.stop();
        speechSynthesis.cancel();
        errorSound.play();
        startBtn.disabled = false;
    }
};

recognition.onend = () => {
    if (isActive && !isSpeaking && !isProcessingResponse && !interimTranscript) {
        if (restartTimeout) clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
            if (isActive && !isSpeaking && !isProcessingResponse) {
                recognition.start();
            }
        }, 500);
    }
};

recognition.onresult = (event) => {
    if (isSpeaking || isProcessingResponse) return;
    
    let currentTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            currentTranscript += transcript;
        } else {
            interimTranscript += transcript;
            status.textContent = `Listening: "${interimTranscript}"`;
        }
    }
    
    if (currentTranscript) {
        interimTranscript = currentTranscript;
        resetSpeechTimeout();
    } else if (interimTranscript) {
        resetSpeechTimeout();
    }
};

recognition.onstart = () => {
    interimTranscript = '';
    status.textContent = "Assistant is listening... Speak your question";
};
