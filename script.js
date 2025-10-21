let instructions = [];
let currentImageSrc = 'CircleStart.png'; // Track the current image source
let generationCount = 0; // Track iteration number
let storedApiKey = null; // Store API key to avoid asking every time
let variantChosen = false; // Track if user has chosen a variant
let variant1Data = null; // Store variant 1 data
let variant2Data = null; // Store variant 2 data
let generationsHistory = []; // Store all generations history

// Vote counting system (3 clicks required)
let variant1Votes = 0; // Count votes for variant 1
let variant2Votes = 0; // Count votes for variant 2
const VOTES_REQUIRED = 3; // Number of clicks needed to proceed

// Raspberry Pi configuration
const RASPBERRY_PI_IP = '10.112.20.53';
const RASPBERRY_PI_PORT = '8765';
const RASPBERRY_PI_BASE_URL = `ws://${RASPBERRY_PI_IP}:${RASPBERRY_PI_PORT}`;

// Retry configuration constants
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

// ========================
// LOADING CONTROL FUNCTIONS
// ========================

function showLoadingIndicators(message = 'Generating new images') {
    const loading1 = document.getElementById('generationLoading1');
    const loading2 = document.getElementById('generationLoading2');

    // Hide all variant content (images, texts, buttons)
    hideVariantContent();

    if (loading1) {
        loading1.textContent = message;
        loading1.style.display = 'block';
    }
    if (loading2) {
        loading2.textContent = message;
        loading2.style.display = 'block';
    }
}

function hideLoadingIndicators() {
    const loading1 = document.getElementById('generationLoading1');
    const loading2 = document.getElementById('generationLoading2');

    if (loading1) loading1.style.display = 'none';
    if (loading2) loading2.style.display = 'none';

    // Show all variant content (images, texts, buttons)
    showVariantContent();
}

function updateLoadingMessage(message) {
    const loading1 = document.getElementById('generationLoading1');
    const loading2 = document.getElementById('generationLoading2');

    if (loading1) {
        loading1.textContent = message;
    }
    if (loading2) {
        loading2.textContent = message;
    }
}

function hideVariantContent() {
    // Hide images
    const img1 = document.getElementById('generatedImage1');
    const img2 = document.getElementById('generatedImage2');
    if (img1) img1.style.display = 'none';
    if (img2) img2.style.display = 'none';

    // Hide instruction texts
    const instruction1 = document.getElementById('usedInstruction1');
    const instruction2 = document.getElementById('usedInstruction2');
    if (instruction1) instruction1.style.display = 'none';
    if (instruction2) instruction2.style.display = 'none';

    // Hide choose buttons
    const chooseButton1 = document.getElementById('chooseVariant1');
    const chooseButton2 = document.getElementById('chooseVariant2');
    if (chooseButton1) chooseButton1.style.display = 'none';
    if (chooseButton2) chooseButton2.style.display = 'none';
}

function showVariantContent() {
    // Show images
    const img1 = document.getElementById('generatedImage1');
    const img2 = document.getElementById('generatedImage2');
    if (img1) img1.style.display = 'block';
    if (img2) img2.style.display = 'block';

    // Show instruction texts
    const instruction1 = document.getElementById('usedInstruction1');
    const instruction2 = document.getElementById('usedInstruction2');
    if (instruction1) instruction1.style.display = 'block';
    if (instruction2) instruction2.style.display = 'block';

    // Show choose buttons
    const chooseButton1 = document.getElementById('chooseVariant1');
    const chooseButton2 = document.getElementById('chooseVariant2');
    if (chooseButton1) chooseButton1.style.display = 'block';
    if (chooseButton2) chooseButton2.style.display = 'block';

    // Initialize vote display when variants are shown
    updateVoteDisplay();
}

// ========================
// LOCALSTORAGE SYNC FUNCTIONS
// ========================

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        console.log(`Saved to localStorage: ${key} (${value.length} chars)`);

        // Verify the save worked
        const retrieved = localStorage.getItem(key);
        if (retrieved !== value) {
            console.error(`localStorage verification failed for ${key}`);
        }
    } catch (error) {
        console.error(`Error saving to localStorage: ${key}`, error);
        if (error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded - clearing old data');
            // Clear some old data and retry
            localStorage.removeItem('variant1_img');
            localStorage.removeItem('variant2_img');
            try {
                localStorage.setItem(key, value);
                console.log(`Retry successful for ${key}`);
            } catch (retryError) {
                console.error(`Retry failed for ${key}`, retryError);
            }
        }
    }
}

function getFromLocalStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage: ${key}`, error);
        return defaultValue;
    }
}

// Save generation state for variant pages
function updateVariantPages() {
    saveToLocalStorage('generationCount', generationCount.toString());
    saveToLocalStorage('isGenerating', 'false');
}

// Convert instruction verbs to past tense
function convertToPastTense(instruction) {
    if (!instruction) return instruction;

    // Common verb conversions for image generation instructions
    const verbConversions = {
        'give': 'gave',
        'make': 'made',
        'duplicate': 'duplicated',
        'place': 'placed',
        'blow': 'blew',
        'turn': 'turned',
        'discipline': 'disciplined',
        'simplify': 'simplified',
        'change': 'changed',
        'adapt': 'adapted',
        'look': 'looked',
        'introduce': 'introduced',
        'remove': 'removed',
        'add': 'added',
        'reduce': 'reduced',
        'wrap': 'wrapped',
        'let': 'let',
        'emphasize': 'emphasized',
        'blur': 'blurred',
        'have': 'had',
        'amplify': 'amplified',
        'convert': 'converted',
        'clean': 'cleaned',
        'abstract': 'abstracted',
        'erase': 'erased',
        'delete': 'deleted',
        'zoom': 'zoomed',
        'rebuild': 'rebuilt',
        'tone': 'toned',
        'offer': 'offered',
        'use': 'used',
        'cut': 'cut',
        'smudge': 'smudged',
        'create': 'created',
        'draw': 'drew',
        'paint': 'painted',
        'transform': 'transformed',
        'modify': 'modified',
        'apply': 'applied',
        'enhance': 'enhanced',
        'increase': 'increased',
        'sharpen': 'sharpened',
        'brighten': 'brightened',
        'darken': 'darkened',
        'rotate': 'rotated',
        'flip': 'flipped',
        'crop': 'cropped',
        'resize': 'resized',
        'scale': 'scaled',
        'shift': 'shifted',
        'move': 'moved',
        'adjust': 'adjusted',
        'distort': 'distorted',
        'stretch': 'stretched',
        'compress': 'compressed',
        'expand': 'expanded',
        'invert': 'inverted',
        'reverse': 'reversed',
        'mirror': 'mirrored',
        'skew': 'skewed',
        'tilt': 'tilted',
        'bend': 'bent',
        'twist': 'twisted',
        'warp': 'warped'
    };

    // Split instruction into words
    const words = instruction.split(' ');

    // Convert first word (verb) if it exists in our conversion map
    if (words.length > 0 && verbConversions[words[0].toLowerCase()]) {
        words[0] = verbConversions[words[0].toLowerCase()];
        // Capitalize first letter
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    }

    return words.join(' ');
}

// Load instructions from JSON file
async function loadInstructions() {
    try {
        const response = await fetch('instructions.json');
        const data = await response.json();
        instructions = data.random_instructions;
        updateInstructionsCounter();
        console.log(`Loaded ${instructions.length} instructions`);
    } catch (error) {
        console.error('Error loading instructions:', error);
        alert('Error loading instructions file');
    }
}

// Get random instruction
function getRandomInstruction() {
    if (instructions.length === 0) {
        return "Transform this image"; // Fallback if all instructions are used
    }
    return instructions[Math.floor(Math.random() * instructions.length)];
}

// Remove instruction from the list
function removeInstruction(instructionElement) {
    // Get the original instruction from dataset if it exists, otherwise use the text content
    const originalInstruction = instructionElement.dataset?.originalInstruction || instructionElement.textContent;
    const index = instructions.indexOf(originalInstruction);
    if (index > -1) {
        instructions.splice(index, 1);
        console.log(`Removed instruction: "${originalInstruction}". Remaining: ${instructions.length}`);
        updateInstructionsCounter();
    }
}

// Update the instructions counter display
function updateInstructionsCounter() {
    const counter = document.getElementById('instructionsCount');
    const container = document.getElementById('instructionsCounter');

    if (counter && container) {
        counter.textContent = instructions.length;

        // Show counter after first generation
        if (instructions.length < 70) { // Assuming original count was around 70
            container.style.display = 'block';
        }

        // Change color when running low
        if (instructions.length < 10) {
            container.style.background = '#ffeeee';
            container.style.borderColor = '#ff0000';
        } else if (instructions.length < 25) {
            container.style.background = '#fff8ee';
            container.style.borderColor = '#ff8800';
        }
    }
}

// Convert image to base64 (handles both URLs and data URLs)
async function imageToBase64(imageSource) {
    // If it's already a data URL, extract the base64 part
    if (imageSource.startsWith('data:')) {
        return imageSource.split(',')[1];
    }

    // If it's a regular URL, fetch and convert
    const response = await fetch(imageSource);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

// Generate two image variants using Gemini 2.5 Flash Image
async function generateImage() {
    const generateButton = document.getElementById('generateButton');
    const currentGenerationContainer = document.getElementById('currentGenerationContainer');

    try {
        // If this is not the first generation and no variant was chosen, 
        // ask user to choose first
        if (generationCount > 0 && !variantChosen && (variant1Data || variant2Data)) {
            alert('Please choose a variant from the current generation first!');
            return;
        }

        generateButton.disabled = true;

        // Show current generation container with loading dots
        currentGenerationContainer.style.display = 'block';
        document.getElementById('variantsContent').style.display = 'block';
        showLoadingIndicators();

        // Reset variant chosen state and vote counts for new generation
        variantChosen = false;
        resetVoteCounts();

        generationCount++;

        // Save generation state to localStorage
        saveToLocalStorage('isGenerating', 'true');
        saveToLocalStorage('generationCount', generationCount.toString());

        // Convert current image to base64 (iterative: use last generated or original)
        console.log('Converting image to base64, source:', currentImageSrc);
        const imageBase64 = await imageToBase64(currentImageSrc);

        // Validate base64 data
        if (!imageBase64 || imageBase64.length < 100) {
            throw new Error('Invalid image data - base64 conversion failed');
        }
        console.log('Base64 conversion successful, size:', imageBase64.length, 'chars');

        // Get API key (ask only once, then store it)
        if (!storedApiKey) {
            storedApiKey = prompt('Please enter your Google AI API key:');
            if (!storedApiKey) {
                throw new Error('API key is required');
            }
        }

        // Validate API key format (basic check)
        if (!storedApiKey.startsWith('AIza') || storedApiKey.length < 30) {
            console.warn('API key format might be incorrect');
        }

        // Generate two variants with different instructions
        const instruction1 = getRandomInstruction();
        let instruction2 = getRandomInstruction();

        // Ensure the instructions are different
        let attempts = 0;
        while (instruction1 === instruction2 && attempts < 10) {
            instruction2 = getRandomInstruction();
            attempts++;
        }

        document.getElementById('usedInstruction1').textContent = convertToPastTense(instruction1);
        document.getElementById('usedInstruction2').textContent = convertToPastTense(instruction2);

        // Store original instructions for removal
        document.getElementById('usedInstruction1').dataset.originalInstruction = instruction1;
        document.getElementById('usedInstruction2').dataset.originalInstruction = instruction2;

        // Generate first variant with retry mechanism
        const variant1Promise = generateSingleVariantWithRetry(imageBase64, instruction1, storedApiKey);

        // Generate second variant with retry mechanism
        const variant2Promise = generateSingleVariantWithRetry(imageBase64, instruction2, storedApiKey);

        // Wait for both variants to complete
        const [variant1Result, variant2Result] = await Promise.all([variant1Promise, variant2Promise]);

        // Display both variants
        if (variant1Result && variant2Result) {
            document.getElementById('generatedImage1').src = variant1Result;
            document.getElementById('generatedImage2').src = variant2Result;

            variant1Data = variant1Result;
            variant2Data = variant2Result;

            // Save variants to localStorage
            saveToLocalStorage('variant1_img', variant1Result);
            saveToLocalStorage('variant1_instruction', instruction1);
            saveToLocalStorage('variant2_img', variant2Result);
            saveToLocalStorage('variant2_instruction', instruction2);
            saveToLocalStorage('isGenerating', 'false');

            console.log(`Generation ${generationCount} saved - Variant2 image size:`, variant2Result.length, 'chars');

            // Hide loading dots and show variants
            hideLoadingIndicators();
            document.getElementById('variantsContent').style.display = 'block';

            // Re-initialize zoom for new variant images
            setTimeout(() => {
                const generatedImage1 = document.getElementById('generatedImage1');
                const generatedImage2 = document.getElementById('generatedImage2');

                // Re-add zoom functionality to new images (these are variant images that use voting)
                makeImageZoomable(generatedImage1, `Generated Variant 1 - Generation ${generationCount}`, true);
                makeImageZoomable(generatedImage2, `Generated Variant 2 - Generation ${generationCount}`, true);
            }, 100);

            // Initialize vote display and status message
            const statusElement = document.getElementById('selectionStatus');
            if (statusElement) {
                statusElement.textContent = `Click 3 times on a variant to select it! | Variant 1: 0/3 votes | Variant 2: 0/3 votes`;
            }

            // Update button text - keep it enabled for manual use if needed
            generateButton.textContent = `Or click here to generate iteration #${generationCount + 1}`;
            generateButton.disabled = false;

            // Update selection status if element exists
            const selectionStatus = document.getElementById('selectionStatus');
            if (selectionStatus) {
                selectionStatus.textContent = 'Choose a variant to generate the next iteration';
            }
            const selectionStatusContainer = document.querySelector('.selection-status');
            if (selectionStatusContainer) {
                selectionStatusContainer.classList.remove('selected');
            }
        } else {
            throw new Error('Failed to generate both variants');
        }

    } catch (error) {
        console.error('Error generating image:', error);
        const errorMessage = error.message || error.toString() || 'Unknown error occurred';
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            error: error
        });

        // Only show alert for critical errors that couldn't be retried
        // (retryable errors like "No image found" and "RECITATION" are handled automatically by the retry mechanism)
        const isRetryableError = errorMessage.includes('No image found in API response') ||
            errorMessage.includes('RECITATION') ||
            errorMessage.includes('Content blocked by AI safety filters');
        if (!isRetryableError) {
            alert(`Error generating image: ${errorMessage}\n\nYou can try choosing a variant again or generate a new image.`);
        } else {
            console.log('All retry attempts failed. The system tried 3 times with 5-second delays for AI safety filters or missing images.');
        }

        generateButton.disabled = false;

        // Hide loading dots in case of error
        hideLoadingIndicators();

        // Reset variant chosen state so user can choose again
        variantChosen = false;

        // Remove selection styling from previous generation if it exists
        document.getElementById('variant1Container').classList.remove('selected');
        document.getElementById('variant2Container').classList.remove('selected');
        const selectionStatusContainer = document.querySelector('.selection-status');
        if (selectionStatusContainer) {
            selectionStatusContainer.classList.remove('selected');
        }

        // Show previous variants if they exist (allow user to choose again)
        if (variant1Data || variant2Data) {
            document.getElementById('variantsContent').style.display = 'block';
            const selectionStatus = document.getElementById('selectionStatus');
            if (selectionStatus) {
                const isRetryableError = errorMessage.includes('No image found in API response') ||
                    errorMessage.includes('RECITATION') ||
                    errorMessage.includes('Content blocked by AI safety filters');
                if (isRetryableError) {
                    selectionStatus.textContent = 'Generation failed after 3 retry attempts (AI safety filters or technical issues). Choose a variant to try again or generate a new image.';
                } else {
                    selectionStatus.textContent = 'Error occurred. Choose a variant to retry or generate a new image.';
                }
            }

            // Re-enable choice buttons
            const chooseButton1 = document.getElementById('chooseVariant1');
            const chooseButton2 = document.getElementById('chooseVariant2');

            if (chooseButton1) chooseButton1.disabled = false;
            if (chooseButton2) chooseButton2.disabled = false;
        }

        // Clear localStorage error state
        saveToLocalStorage('isGenerating', 'false');
    }
}

// Generate a single variant
async function generateSingleVariant(imageBase64, instruction, apiKey) {
    try {
        console.log('Generating variant with instruction:', instruction);
        console.log('Image data size:', imageBase64.length, 'chars');

        const fullPrompt = `${instruction}. Modify this image according to the instruction`;

        const requestBody = {
            contents: [{
                parts: [
                    {
                        text: fullPrompt
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.8,
                candidateCount: 1,
                maxOutputTokens: 2048,
            }
        };

        console.log('Making API request to Gemini...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('API Response received:', result);

        // Check if the response contains an image
        if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
            const parts = result.candidates[0].content.parts;
            console.log('Response parts:', parts);

            for (const part of parts) {
                console.log('Checking part:', part);
                if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                    console.log('Found image part with mimeType:', part.inlineData.mimeType);
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
                if (part.text) {
                    console.log('Found text part:', part.text);
                }
            }
        } else {
            console.log('Response structure unexpected:');
            console.log('- result.candidates exists:', !!result.candidates);
            if (result.candidates) {
                console.log('- result.candidates[0] exists:', !!result.candidates[0]);
                if (result.candidates[0]) {
                    console.log('- result.candidates[0].content exists:', !!result.candidates[0].content);
                    if (result.candidates[0].content) {
                        console.log('- result.candidates[0].content.parts exists:', !!result.candidates[0].content.parts);
                    }
                }
            }
        }

        // Check if there's an error message in the response
        if (result.error) {
            throw new Error(`API Error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        // Check if the content was blocked or filtered
        if (result.candidates && result.candidates[0] && result.candidates[0].finishReason) {
            const finishReason = result.candidates[0].finishReason;
            if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
                throw new Error(`Content blocked by AI safety filters. Reason: ${finishReason}. Try a different instruction.`);
            }
        }

        throw new Error('No image found in API response - the AI may have returned only text or encountered an issue generating the image');

    } catch (error) {
        console.error('Error in generateSingleVariant:', error);
        // Don't wrap the error message again if it's already a custom error
        if (error.message.startsWith('API Error:') || error.message.startsWith('Content blocked:') || error.message.startsWith('No image found:')) {
            throw error;
        }
        throw new Error(`Network error: ${error.message || 'Failed to connect to API'}`);
    }
}

// ========================
// RETRY WRAPPER FUNCTION
// ========================

async function generateSingleVariantWithRetry(imageBase64, instruction, apiKey, attemptNumber = 1) {
    try {
        console.log(`Generation attempt ${attemptNumber}/${MAX_RETRY_ATTEMPTS} for instruction: "${instruction.substring(0, 50)}..."`);

        return await generateSingleVariant(imageBase64, instruction, apiKey);
    } catch (error) {
        console.error(`Attempt ${attemptNumber} failed:`, error.message);

        // Check if this is an error we want to retry for
        const isRetryableError = error.message.includes('No image found in API response') ||
            error.message.includes('RECITATION') ||
            error.message.includes('Content blocked by AI safety filters');

        if (isRetryableError && attemptNumber < MAX_RETRY_ATTEMPTS) {
            const errorType = error.message.includes('RECITATION') ? 'AI safety filter (RECITATION)' :
                error.message.includes('Content blocked') ? 'AI safety filter' :
                    'Missing image in response';

            console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds... (Error: ${errorType})`);

            // Wait for the specified delay
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

            // Recursive retry
            return await generateSingleVariantWithRetry(imageBase64, instruction, apiKey, attemptNumber + 1);
        } else {
            // If it's not a retryable error or we've exceeded max attempts, throw the error
            throw error;
        }
    }
}



// ========================
// VARIANT SELECTION FUNCTIONS
// ========================

// Vote for variant 1 (3 votes required to proceed)
async function chooseVariant1() {
    try {
        // Show physical button feedback if triggered by physical button
        if (window.physicalButtonsAvailable) {
            showPhysicalButtonFeedback('variant1');
        }

        // Increment vote count
        variant1Votes++;
        console.log(`🗳️ Vote for Variant 1! Current votes: ${variant1Votes}/${VOTES_REQUIRED}`);

        // Update vote display
        updateVoteDisplay();

        // Check if enough votes to proceed
        if (variant1Votes >= VOTES_REQUIRED) {
            console.log('✅ Variant 1 has enough votes! Proceeding...');

            currentImageSrc = variant1Data;
            variantChosen = true;

            // Remove the instruction from variant 2 (not chosen) from future use
            const variant2InstructionElement = document.getElementById('usedInstruction2');
            removeInstruction(variant2InstructionElement);

            // Update UI to show final selection
            document.getElementById('variant1Container').classList.add('selected');
            document.getElementById('variant2Container').classList.remove('selected');

            // Update selection status if element exists
            const selectionStatus = document.getElementById('selectionStatus');
            if (selectionStatus) {
                selectionStatus.textContent = 'Variant 1 wins! Generating next iteration...';
                if (selectionStatus.parentElement) {
                    selectionStatus.parentElement.classList.add('selected');
                }
            }

            // Reset vote counts for next round
            resetVoteCounts();

            // Add current generation to history
            addGenerationToHistory(1);

            // Automatically start next generation
            await generateImage();
        } else {
            // Not enough votes yet, just show feedback
            const selectionStatus = document.getElementById('selectionStatus');
            if (selectionStatus) {
                selectionStatus.textContent = `Variant 1: ${variant1Votes}/${VOTES_REQUIRED} votes | Variant 2: ${variant2Votes}/${VOTES_REQUIRED} votes`;
            }
        }
    } catch (error) {
        console.error('Error in chooseVariant1:', error);
        // Reset the selection state if generation fails
        variantChosen = false;
        document.getElementById('variant1Container').classList.remove('selected');

        // Update selection status if element exists
        const selectionStatus = document.getElementById('selectionStatus');
        if (selectionStatus) {
            selectionStatus.textContent = 'Error occurred. Please choose a variant again.';
            if (selectionStatus.parentElement) {
                selectionStatus.parentElement.classList.remove('selected');
            }
        }
    }
}

// Vote for variant 2 (3 votes required to proceed)
async function chooseVariant2() {
    try {
        // Show physical button feedback if triggered by physical button

        // Increment vote count
        variant2Votes++;
        console.log(`🗳️ Vote for Variant 2! Current votes: ${variant2Votes}/${VOTES_REQUIRED}`);

        // Update vote display
        updateVoteDisplay();

        // Check if enough votes to proceed
        if (variant2Votes >= VOTES_REQUIRED) {
            console.log('✅ Variant 2 has enough votes! Proceeding...');

            currentImageSrc = variant2Data;
            variantChosen = true;

            // Remove the instruction from variant 1 (not chosen) from future use
            const variant1InstructionElement = document.getElementById('usedInstruction1');
            removeInstruction(variant1InstructionElement);

            // Update UI to show final selection
            document.getElementById('variant2Container').classList.add('selected');
            document.getElementById('variant1Container').classList.remove('selected');

            // Update selection status if element exists
            const selectionStatus = document.getElementById('selectionStatus');
            if (selectionStatus) {
                selectionStatus.textContent = 'Variant 2 wins! Generating next iteration...';
                if (selectionStatus.parentElement) {
                    selectionStatus.parentElement.classList.add('selected');
                }
            }

            // Reset vote counts for next round
            resetVoteCounts();

            // Add current generation to history
            addGenerationToHistory(2);

            // Automatically start next generation
            await generateImage();
        } else {
            // Not enough votes yet, just show feedback
            const selectionStatus = document.getElementById('selectionStatus');
            if (selectionStatus) {
                selectionStatus.textContent = `Variant 1: ${variant1Votes}/${VOTES_REQUIRED} votes | Variant 2: ${variant2Votes}/${VOTES_REQUIRED} votes`;
            }
        }
    } catch (error) {
        console.error('Error in chooseVariant2:', error);
        // Reset the selection state if generation fails
        variantChosen = false;
        document.getElementById('variant2Container').classList.remove('selected');

        // Update selection status if element exists
        const selectionStatus = document.getElementById('selectionStatus');
        if (selectionStatus) {
            selectionStatus.textContent = 'Error occurred. Please choose a variant again.';
            if (selectionStatus.parentElement) {
                selectionStatus.parentElement.classList.remove('selected');
            }
        }
    }
}

// ========================
// VOTE MANAGEMENT FUNCTIONS
// ========================

// Reset vote counts for new generation
function resetVoteCounts() {
    variant1Votes = 0;
    variant2Votes = 0;
    console.log('🔄 Vote counts reset for new generation');
    updateVoteDisplay();
}

// Update vote display in UI
function updateVoteDisplay() {
    // Update variant containers with vote indicators
    const variant1Container = document.getElementById('variant1Container');
    const variant2Container = document.getElementById('variant2Container');

    if (variant1Container) {
        // Add or update vote counter
        let voteCounter = variant1Container.querySelector('.vote-counter');
        if (!voteCounter) {
            voteCounter = document.createElement('div');
            voteCounter.className = 'vote-counter';
            variant1Container.appendChild(voteCounter);
        }
        voteCounter.textContent = `Votes: ${variant1Votes}/${VOTES_REQUIRED}`;

        // Add visual indication of vote progress
        variant1Container.style.opacity = variant1Votes > 0 ? '1' : '0.8';

    }

    if (variant2Container) {
        // Add or update vote counter
        let voteCounter = variant2Container.querySelector('.vote-counter');
        if (!voteCounter) {
            voteCounter = document.createElement('div');
            voteCounter.className = 'vote-counter';
            variant2Container.appendChild(voteCounter);
        }
        voteCounter.textContent = `Votes: ${variant2Votes}/${VOTES_REQUIRED}`;

        // Add visual indication of vote progress
        variant2Container.style.opacity = variant2Votes > 0 ? '1' : '0.8';

    }
}

// Add current generation to history
function addGenerationToHistory(selectedVariant) {
    const generation = {
        number: generationCount,
        variant1: {
            image: variant1Data,
            instruction: document.getElementById('usedInstruction1').textContent
        },
        variant2: {
            image: variant2Data,
            instruction: document.getElementById('usedInstruction2').textContent
        },
        selectedVariant: selectedVariant
    };

    generationsHistory.push(generation);
    renderHistory();

    // Show history title if this is the first generation
    if (generationsHistory.length === 1) {
        document.getElementById('historyTitle').style.display = 'block';
    }

    // Scroll to the new generation smoothly
    setTimeout(() => {
        const currentContainer = document.getElementById('currentGenerationContainer');
        currentContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Render the generations history
function renderHistory() {
    const historyContainer = document.getElementById('generationsHistory');
    historyContainer.innerHTML = '';

    generationsHistory.forEach((generation, index) => {
        const generationDiv = document.createElement('div');
        generationDiv.className = 'generation-item';
        if (index === generationsHistory.length - 1) {
            generationDiv.classList.add('selected-generation');
        }

        generationDiv.innerHTML = `
            <div class="generation-header">
                <div class="generation-number">Generation ${generation.number}</div>
            </div>
            <div class="history-variants-grid">
                <div class="history-variant ${generation.selectedVariant === 1 ? 'was-selected' : ''}">
                    <h4>Variant 1</h4>
                    <img src="${generation.variant1.image}" alt="Generation ${generation.number} Variant 1">
                    <p>${generation.variant1.instruction}</p>
                </div>
                <div class="history-variant ${generation.selectedVariant === 2 ? 'was-selected' : ''}">
                    <h4>Variant 2</h4>
                    <img src="${generation.variant2.image}" alt="Generation ${generation.number} Variant 2">
                    <p>${generation.variant2.instruction}</p>
                </div>
            </div>
        `;

        historyContainer.appendChild(generationDiv);
    });

    // Make all history images zoomable after they're added to DOM
    setTimeout(() => {
        makeHistoryImagesZoomable();
    }, 100);
}



// Reset context (clear localStorage and reset everything)
function resetContext() {
    if (confirm('This will reset everything including the voting system and clear all stored data. Are you sure?')) {
        // Clear all localStorage data
        try {
            localStorage.clear();
            console.log('localStorage cleared');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }

        // Reset all variables to initial state
        currentImageSrc = 'CircleStart.png';
        generationCount = 0;
        variantChosen = false;
        variant1Data = null;
        variant2Data = null;
        generationsHistory = [];
        storedApiKey = null; // This will ask for API key again

        // Hide all containers
        const variantsContent = document.getElementById('variantsContent');

        hideLoadingIndicators();
        if (variantsContent) variantsContent.style.display = 'none';

        document.getElementById('historyTitle').style.display = 'none';
        document.getElementById('instructionsCounter').style.display = 'none';

        // Clear history
        document.getElementById('generationsHistory').innerHTML = '';

        // Reset button and instruction text
        document.getElementById('generateButton').textContent = 'Generate New Image';
        document.getElementById('generateButton').disabled = false;
        document.getElementById('usedInstruction1').textContent = '';
        document.getElementById('usedInstruction2').textContent = '';

        // Clear selection states
        document.getElementById('variant1Container').classList.remove('selected');
        document.getElementById('variant2Container').classList.remove('selected');
        document.querySelector('.selection-status').classList.remove('selected');

        // Reload instructions from JSON
        loadInstructions();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        alert('Context reset successfully! All data cleared.');
    }
}

// ========================
// PHYSICAL BUTTON SUPPORT
// ========================

async function checkPhysicalButton() {
    try {
        // Fast request with short timeout for quick response
        const response = await fetch(`${RASPBERRY_PI_BASE_URL}/check-button-press`, {
            signal: AbortSignal.timeout(500) // 500ms timeout for faster failure
        });
        const data = await response.json();

        if (data.button_pressed) {
            const buttonType = data.button_type;
            console.log(`🔘 Physical button pressed: ${buttonType} at ${new Date().toLocaleTimeString()}`);

            if (buttonType === 'variant1') {
                // Only allow variant selection if variants are available and no variant chosen yet
                if (variant1Data && !variantChosen) {
                    console.log('✅ Physical button triggered: Choosing Variant 1');
                    // Show immediate visual feedback
                    showPhysicalButtonFeedback('variant1');
                    await chooseVariant1();
                } else {
                    console.log('❌ Physical button ignored: Variant 1 not available or already chosen');
                    console.log(`   - variant1Data exists: ${!!variant1Data}`);
                    console.log(`   - variantChosen: ${variantChosen}`);
                }
            } else if (buttonType === 'variant2') {
                // Only allow variant selection if variants are available and no variant chosen yet
                if (variant2Data && !variantChosen) {
                    console.log('✅ Physical button triggered: Choosing Variant 2');
                    // Show immediate visual feedback
                    showPhysicalButtonFeedback('variant2');
                    await chooseVariant2();
                } else {
                    console.log('❌ Physical button ignored: Variant 2 not available or already chosen');
                    console.log(`   - variant2Data exists: ${!!variant2Data}`);
                    console.log(`   - variantChosen: ${variantChosen}`);
                }
            }
        }
    } catch (error) {
        // Only log error every 30 seconds to avoid spam but still provide info
        if (!checkPhysicalButton.lastErrorTime || Date.now() - checkPhysicalButton.lastErrorTime > 30000) {
            console.log('🔴 Physical button check failed (normal if running without Raspberry Pi):', error.message);
            checkPhysicalButton.lastErrorTime = Date.now();
        }
    }
}

// Check for physical button presses every 500ms 
//setInterval(checkPhysicalButton, 500);

const handleMessageFromWebSocket = (socketMessage) => {
    const { data } = socketMessage;
    const {event, button} = JSON.parse(data);

    if (event === 'PRESSED') {
        console.log('Physical button pressed: Button', button);
        if (button === 1) {
            showPhysicalButtonFeedback('variant1');
            chooseVariant1();
        } else if (button === 2) {
            showPhysicalButtonFeedback('variant2');
            chooseVariant2();
        } else {
            console.warn("Unknown button?", button)
        }
    } else if (event === 'RELEASED') {}
    else {
        console.warn('UNKNOWN MESSAGE FROM SOCKET', event, button, data);
    }
}

// Test connection to Raspberry Pi (useful for debugging)
async function testRaspberryPiConnection() {
    try {
        console.log(`🔍 Testing connection to Raspberry Pi at ${RASPBERRY_PI_BASE_URL}...`);
        const response = await fetch(`${RASPBERRY_PI_BASE_URL}/gpio-info`);
        const data = await response.json();
        console.log('✅ Raspberry Pi connection successful!', data);
        return true;
    } catch (error) {
        console.log('❌ Raspberry Pi connection failed:', error.message);
        console.log(`   Make sure the Raspberry Pi is running at ${RASPBERRY_PI_BASE_URL}`);
        console.log('   Check: sudo python3 buttons.py on the Raspberry Pi');
        return false;
    }
}

// Function to provide fast visual feedback when physical buttons are pressed
function showPhysicalButtonFeedback(buttonType) {
    const containerSelector = buttonType === 'variant1' ? '#variant1Container' : '#variant2Container';
    const container = document.querySelector(containerSelector);

    if (container) {
        // Add immediate, snappy feedback
        container.style.transform = 'scale(1.08)';
        container.style.boxShadow = '0 0 25px rgba(76, 175, 80, 0.8)';
        container.style.border = '3px solid #4CAF50';
        container.style.transition = 'all 0.1s ease';

        // Quick flash effect
        container.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';

        // Remove the effect quickly for snappy response
        setTimeout(() => {
            container.style.transform = '';
            container.style.boxShadow = '';
            container.style.border = '';
            container.style.backgroundColor = '';
            container.style.transition = 'all 0.15s ease';
        }, 200);
    }

    // Add console feedback for immediate confirmation
    console.log(`⚡ PHYSICAL BUTTON ${buttonType.toUpperCase()} - IMMEDIATE FEEDBACK!`);
}

// ========================
// IMAGE ZOOM FUNCTIONALITY
// ========================

function openImageZoom(imageSrc, imageInfo = '') {
    const modal = document.getElementById('imageZoomModal');
    const zoomedImage = document.getElementById('zoomedImage');
    const zoomInfo = document.getElementById('zoomImageInfo');

    if (modal && zoomedImage) {
        zoomedImage.src = imageSrc;
        if (zoomInfo) {
            zoomInfo.textContent = imageInfo;
        }
        modal.style.display = 'flex';

        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';

        console.log('🔍 Image zoom opened:', imageInfo || 'No info');

        // Add click outside to close
        modal.onclick = function (e) {
            if (e.target === modal) {
                console.log('🔘 Clicked outside image - closing zoom');
                closeImageZoom();
            }
        };

    } else {
        console.error('❌ Modal elements not found:', {
            modal: !!modal,
            zoomedImage: !!zoomedImage,
            zoomInfo: !!zoomInfo
        });
    }
}

function closeImageZoom() {
    const modal = document.getElementById('imageZoomModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('❌ Image zoom closed');
    }
}

function makeImageZoomable(imageElement, imageInfo = '', isVariantImage = false) {
    if (!imageElement) return;

    // Add zoomable class for styling
    imageElement.classList.add('zoomable-image');

    if (isVariantImage) {
        // For variant images, use double-click to zoom (single click is for voting)
        imageElement.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Only zoom if image has a valid src
            if (this.src && this.src !== window.location.href) {
                openImageZoom(this.src, imageInfo);
            }
        });

        // Add title for double-click instruction
        imageElement.title = 'Single click to vote, double-click to zoom';

        // Add visual hint for double-click
        imageElement.style.position = 'relative';

    } else {
        // For history and original images, use single click to zoom
        imageElement.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Only zoom if image has a valid src
            if (this.src && this.src !== window.location.href) {
                openImageZoom(this.src, imageInfo);
            }
        });

        // Add title attribute for accessibility
        imageElement.title = 'Click to zoom';
    }
}

function initializeImageZoom() {
    // Make original image zoomable (single click)
    const originalImage = document.getElementById('originalImage');
    makeImageZoomable(originalImage, 'Original Image', false);

    // Make current variant images zoomable (double click for voting images)
    const generatedImage1 = document.getElementById('generatedImage1');
    const generatedImage2 = document.getElementById('generatedImage2');

    makeImageZoomable(generatedImage1, 'Generated Variant 1', true);
    makeImageZoomable(generatedImage2, 'Generated Variant 2', true);

    // Setup modal close events - only click outside to close
    const modal = document.getElementById('imageZoomModal');

    console.log('🔍 Setting up modal close events (click outside only)');

    // Close on modal background click only
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                console.log('🔘 Clicked outside image - closing');
                closeImageZoom();
            }
        });
        console.log('✅ Modal background listener added');
    } else {
        console.error('❌ Modal not found');
    }

    console.log('🔍 Image zoom functionality initialized');
}

function makeHistoryImagesZoomable() {
    // Make all history images zoomable (called when history is updated)
    const historyImages = document.querySelectorAll('#generationsHistory img');
    historyImages.forEach((img) => {
        // Extract generation info from alt text or nearby elements
        const altText = img.alt || '';
        const generationMatch = altText.match(/Generation (\d+) Variant (\d+)/);

        let imageInfo = 'History Image';
        if (generationMatch) {
            const generation = generationMatch[1];
            const variant = generationMatch[2];
            imageInfo = `Generation ${generation} - Variant ${variant}`;

            // Check if this variant was selected
            const parentDiv = img.closest('.history-variant');
            if (parentDiv && parentDiv.classList.contains('was-selected')) {
                imageInfo += ' (Selected)';
            }
        }

        makeImageZoomable(img, imageInfo);
    });

    console.log(`🔍 Made ${historyImages.length} history images zoomable`);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadInstructions();
    document.getElementById('generateButton').addEventListener('click', generateImage);

    // Test Raspberry Pi connection on page load
    // document.getElementById('resetContextButton').addEventListener('click', resetContext);
    // document.getElementById('chooseVariant1').addEventListener('click', chooseVariant1);
    // document.getElementById('chooseVariant2').addEventListener('click', chooseVariant2);

    // Initialize image zoom functionality
    initializeImageZoom();

    // Initialize physical button status check
    const socket = new WebSocket(`ws://${RASPBERRY_PI_BASE_URL}`);
    socket.onmessage = handleMessageFromWebSocket;
});