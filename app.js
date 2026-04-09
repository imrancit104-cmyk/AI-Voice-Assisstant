const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
let output = document.getElementById('output');
let aiActive = document.getElementById('aiactive');
let core = document.querySelector('.core');
const rings = document.querySelectorAll('.ring');
let isActive = false;
let isSpeaking = false;
let controller;
let isAwaitingResponse = false;
let finalTranscript = '';

const startSound = new Audio('startsound.mp3');
const endSound = new Audio('endsound.mp3');
const errorSound = new Audio('errorsound.mp3');

let recognition;
let silenceTimer;
let isRecognizing = false;

function initRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
        isRecognizing = true;
        finalTranscript = '';
        status.textContent = "Listening... Please speak your question";
    };
    
    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            if (isActive && !isSpeaking && !isAwaitingResponse) {
                setTimeout(() => {
                    if (isActive && !isSpeaking && !isAwaitingResponse) {
                        recognition.start();
                    }
                }, 500);
            }
        }
        if (event.error === 'network') {
            status.textContent = 'Network error. Please check your connection.';
            isActive = false;
            isSpeaking = false;
            isAwaitingResponse = false;
            aiActive.textContent = "Network Connection Lost!";
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
        isRecognizing = false;
        if (isActive && !isSpeaking && !isAwaitingResponse && finalTranscript) {
            processUserInput(finalTranscript);
        } else if (isActive && !isSpeaking && !isAwaitingResponse) {
            setTimeout(() => {
                if (isActive && !isSpeaking && !isAwaitingResponse) {
                    recognition.start();
                }
            }, 500);
        }
    };
    
    recognition.onresult = (event) => {
        if (isSpeaking || isAwaitingResponse) return;
        
        if (silenceTimer) clearTimeout(silenceTimer);
        
        let interimText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimText += transcript;
            }
        }
        
        if (interimText) {
            status.textContent = `Listening: "${interimText}"`;
        } else if (finalTranscript) {
            status.textContent = `Heard: "${finalTranscript.trim()}"`;
        }
        
        silenceTimer = setTimeout(() => {
            if (finalTranscript.trim() && isActive && !isSpeaking && !isAwaitingResponse) {
                recognition.stop();
            }
        }, 1500);
    };
}

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

async function processUserInput(userText) {
    if (isAwaitingResponse || isSpeaking) return;
    
    isAwaitingResponse = true;
    const cleanedText = userText.trim();
    
    status.textContent = `You asked: "${cleanedText}" | Getting response...`;
    
    const answer = await getGroqResponse(cleanedText);
    
    if (!answer || !isActive) {
        isAwaitingResponse = false;
        finalTranscript = '';
        if (isActive && !isSpeaking) {
            setTimeout(() => {
                if (isActive && !isSpeaking && !isAwaitingResponse) {
                    recognition.start();
                }
            }, 500);
        }
        return;
    }
    
    status.textContent = `You asked: "${cleanedText}"`;
    output.innerHTML = answer;
    isSpeaking = true;
    
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    utterance.onend = () => {
        isSpeaking = false;
        isAwaitingResponse = false;
        finalTranscript = '';
        
        setTimeout(() => {
            if (isActive && !isSpeaking && !isAwaitingResponse) {
                recognition.start();
            }
        }, 1000);
    };
    
    utterance.onerror = () => {
        isSpeaking = false;
        isAwaitingResponse = false;
        if (isActive) {
            setTimeout(() => {
                if (isActive && !isSpeaking && !isAwaitingResponse) {
                    recognition.start();
                }
            }, 1000);
        }
    };
    
    speechSynthesis.speak(utterance);
}

startBtn.addEventListener('click', () => {
    if (!isActive) {
        if (recognition && isSpeaking) {
            speechSynthesis.cancel();
        }
        
        if (silenceTimer) clearTimeout(silenceTimer);
        
        isActive = true;
        isSpeaking = false;
        isAwaitingResponse = false;
        finalTranscript = '';
        
        if (!recognition) {
            initRecognition();
        }
        
        startSound.play();
        core.classList.remove('core-wifi');
        rings.forEach(r => r.classList.add('pulse'));
        rings.forEach(r => r.classList.remove('pulse2'));
        core.style.top = '40.2%';
        core.style.boxShadow = '0 0 2rem #8fefff, inset 0 0 1.5625rem #8fefff';
        core.style.backgroundColor = '#8fefff';
        aiActive.style.color = '#8fefff';
        aiActive.textContent = "ARIM Assistant Active";
        status.textContent = "Starting assistant...";
        startBtn.disabled = true;
        
        setTimeout(() => {
            let testing = new SpeechSynthesisUtterance('Greetings, I am your Arim AI assistant. How can I assist you today?');
            testing.lang = 'en-US';
            
            testing.onend = () => {
                setTimeout(() => {
                    if (isActive && !isSpeaking && !isAwaitingResponse) {
                        recognition.start();
                    }
                }, 1000);
            };
            
            speechSynthesis.speak(testing);
        }, 1000);
    }
});

stopBtn.addEventListener('click', () => {
    if (isActive) {
        isActive = false;
        isSpeaking = false;
        isAwaitingResponse = false;
        finalTranscript = '';
        
        aiActive.textContent = "ARIM Assistant Disabled";
        output.innerHTML = '';
        
        if (controller) {
            controller.abort();
            controller = null;
        }
        
        if (silenceTimer) clearTimeout(silenceTimer);
        
        if (recognition) {
            try {
                recognition.stop();
            } catch(e) {}
        }
        
        speechSynthesis.cancel();
        endSound.play();
        status.textContent = "Assistant stopped.";
        startBtn.disabled = false;
        rings.forEach(r => r.classList.remove('pulse'));
        rings.forEach(r => r.classList.remove('pulse2'));
        core.classList.remove('core-wifi');
    }
});

initRecognition();
