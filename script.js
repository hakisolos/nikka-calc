document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeSwitch = document.getElementById('theme-switch');
    themeSwitch.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        saveSettings();
    });

    // Calculator state
    const calculator = {
        displayValue: '0',
        firstOperand: null,
        waitingForSecondOperand: false,
        operator: null,
        memory: 0,
        currentMode: 'standard',
        isInRadMode: true,
        currentBase: 'dec',
        history: []
    };

    // Constants
    const MATH_CONSTANTS = {
        PI: Math.PI,
        E: Math.E
    };

    // DOM Elements
    const display = document.getElementById('display');
    const historyDisplay = document.getElementById('history');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const keypadSections = document.querySelectorAll('.keypad-section');
    const baseBtns = document.querySelectorAll('.base-btn');
    const hexButtons = document.querySelectorAll('.hex-btn');

    // Event Listeners
    const keys = document.querySelector('.keypad');
    keys.addEventListener('click', (event) => {
        const target = event.target;
        
        // If clicked element is not a button, return
        if (!target.matches('button')) return;
        
        if (target.classList.contains('number')) {
            inputDigit(target.dataset.value);
        } else if (target.classList.contains('operator')) {
            handleOperator(target.dataset.action);
        } else if (target.classList.contains('equals')) {
            calculate();
        } else if (target.classList.contains('function')) {
            handleFunction(target.dataset.action);
        } else if (target.classList.contains('memory-btn')) {
            handleMemoryOperation(target.dataset.action);
        } else if (target.classList.contains('base-btn')) {
            setBase(target.dataset.base);
        } else if (target.classList.contains('hex-btn')) {
            if (!target.classList.contains('disabled')) {
                inputDigit(target.dataset.value);
            }
        }
        
        updateDisplay();
    });

    // Mode toggle
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setCalculatorMode(btn.dataset.mode);
            saveSettings();
        });
    });

    // Clear history
    clearHistoryBtn.addEventListener('click', () => {
        calculator.history = [];
        updateHistoryList();
        localStorage.removeItem('calculatorHistory');
    });

    // Input functions
    function inputDigit(digit) {
        const { displayValue, waitingForSecondOperand } = calculator;
        
        // Handle base restrictions
        if (calculator.currentBase === 'bin' && !['0', '1', '.'].includes(digit)) return;
        if (calculator.currentBase === 'oct' && !['0', '1', '2', '3', '4', '5', '6', '7', '.'].includes(digit)) return;
        if (calculator.currentBase === 'dec' && digit.match(/[A-F]/i)) return;
        
        // Handling decimal point
        if (digit === '.') {
            if (waitingForSecondOperand) {
                calculator.displayValue = '0.';
                calculator.waitingForSecondOperand = false;
                return;
            }
            
            if (!displayValue.includes('.')) {
                calculator.displayValue += '.';
            }
            return;
        }
        
        if (waitingForSecondOperand) {
            calculator.displayValue = digit;
            calculator.waitingForSecondOperand = false;
        } else {
            calculator.displayValue = displayValue === '0' ? digit : displayValue + digit;
        }
    }

    function handleOperator(nextOperator) {
        const { firstOperand, displayValue, operator } = calculator;
        const inputValue = parseInput(displayValue);
        
        if (firstOperand === null && !isNaN(inputValue)) {
            calculator.firstOperand = inputValue;
        } else if (operator) {
            const result = performCalculation();
            calculator.displayValue = formatResult(result);
            calculator.firstOperand = result;
        }
        
        calculator.waitingForSecondOperand = true;
        calculator.operator = nextOperator;
        updateHistoryDisplay();
    }

    function calculate() {
        const { firstOperand, displayValue, operator } = calculator;
        
        if (firstOperand === null || operator === null) return;
        
        const inputValue = parseInput(displayValue);
        const result = performCalculation();
        
        // Create history entry
        const historyEntry = {
            expression: `${formatResult(firstOperand)} ${getOperatorSymbol(operator)} ${formatResult(inputValue)}`,
            result: formatResult(result),
            timestamp: new Date().toISOString()
        };
        
        calculator.history.unshift(historyEntry);
        if (calculator.history.length > 20) calculator.history.pop();
        
        calculator.displayValue = formatResult(result);
        calculator.firstOperand = result;
        calculator.operator = null;
        calculator.waitingForSecondOperand = true;
        
        historyDisplay.textContent = '';
        updateHistoryList();
        saveHistory();
    }

    function handleFunction(func) {
        const { displayValue } = calculator;
        const inputValue = parseInput(displayValue);
        let result;
        
        switch (func) {
            case 'clear':
                resetCalculator();
                return;
            case 'backspace':
                if (calculator.displayValue.length > 1) {
                    calculator.displayValue = calculator.displayValue.slice(0, -1);
                } else {
                    calculator.displayValue = '0';
                }
                return;
            case 'negate':
                calculator.displayValue = formatResult(-parseInput(displayValue));
                return;
            case 'percent':
                result = parseInput(displayValue) / 100;
                break;
            case 'sqrt':
                if (inputValue < 0) {
                    setError("Invalid input for square root");
                    return;
                }
                result = Math.sqrt(inputValue);
                break;
            case 'cbrt':
                result = Math.cbrt(inputValue);
                break;
            case 'square':
                result = Math.pow(inputValue, 2);
                break;
            case 'cube':
                result = Math.pow(inputValue, 3);
                break;
            case 'sin':
                result = calculator.isInRadMode 
                    ? Math.sin(inputValue) 
                    : Math.sin(inputValue * Math.PI / 180);
                break;
            case 'cos':
                result = calculator.isInRadMode 
                    ? Math.cos(inputValue) 
                    : Math.cos(inputValue * Math.PI / 180);
                break;
            case 'tan':
                result = calculator.isInRadMode 
                    ? Math.tan(inputValue) 
                    : Math.tan(inputValue * Math.PI / 180);
                break;
            case 'asin':
                if (inputValue < -1 || inputValue > 1) {
                    setError("Value must be between -1 and 1");
                    return;
                }
                result = calculator.isInRadMode 
                    ? Math.asin(inputValue) 
                    : Math.asin(inputValue) * 180 / Math.PI;
                break;
            case 'acos':
                if (inputValue < -1 || inputValue > 1) {
                    setError("Value must be between -1 and 1");
                    return;
                }
                result = calculator.isInRadMode 
                    ? Math.acos(inputValue) 
                    : Math.acos(inputValue) * 180 / Math.PI;
                break;
            case 'atan':
                result = calculator.isInRadMode 
                    ? Math.atan(inputValue) 
                    : Math.atan(inputValue) * 180 / Math.PI;
                break;
            case 'log':
                if (inputValue <= 0) {
                    setError("Invalid input for logarithm");
                    return;
                }
                result = Math.log10(inputValue);
                break;
            case 'ln':
                if (inputValue <= 0) {
                    setError("Invalid input for natural logarithm");
                    return;
                }
                result = Math.log(inputValue);
                break;
            case 'power':
                calculator.firstOperand = inputValue;
                calculator.operator = 'power';
                calculator.waitingForSecondOperand = true;
                updateHistoryDisplay();
                return;
            case 'factorial':
                if (inputValue < 0 || !Number.isInteger(inputValue)) {
                    setError("Invalid input for factorial");
                    return;
                }
                result = factorial(inputValue);
                break;
            case 'pi':
                result = MATH_CONSTANTS.PI;
                break;
            case 'e':
                result = MATH_CONSTANTS.E;
                break;
            case 'rad':
                calculator.isInRadMode = true;
                return;
            case 'deg':
                calculator.isInRadMode = false;
                return;
            case 'exp':
                calculator.displayValue += 'e+0';
                return;
            case 'mod':
                calculator.firstOperand = inputValue;
                calculator.operator = 'mod';
                calculator.waitingForSecondOperand = true;
                updateHistoryDisplay();
                return;
            case 'and':
                calculator.firstOperand = inputValue;
                calculator.operator = 'and';
                calculator.waitingForSecondOperand = true;
                updateHistoryDisplay();
                return;
            case 'or':
                calculator.firstOperand = inputValue;
                calculator.operator = 'or';
                calculator.waitingForSecondOperand = true;
                updateHistoryDisplay();
                return;
            case 'xor':
                calculator.firstOperand = inputValue;
                calculator.operator = 'xor';
                calculator.waitingForSecondOperand = true;
                updateHistoryDisplay();
                return;
            case 'not':
                result = ~Math.floor(inputValue);
                break;
            case 'lsh':
                calculator.firstOperand = inputValue;
                calculator.operator = 'lsh';
                calculator.waitingForSecondOperand = true;
                updateHistoryDisplay();
                return;
            case 'rsh':
                calculator.firstOperand = inputValue;
                calculator.operator = 'rsh';
                calculator.waitingForSecondOperand = true;
                updateHistoryDisplay();
                return;
        }
        
        calculator.displayValue = formatResult(result);
        calculator.firstOperand = result;
        calculator.waitingForSecondOperand = true;
    }

    function handleMemoryOperation(action) {
        const { displayValue } = calculator;
        const inputValue = parseInput(displayValue);
        
        switch (action) {
            case 'mc': // Memory Clear
                calculator.memory = 0;
                break;
            case 'mr': // Memory Recall
                calculator.displayValue = formatResult(calculator.memory);
                calculator.waitingForSecondOperand = false;
                break;
            case 'm+': // Memory Add
                calculator.memory += inputValue;
                calculator.waitingForSecondOperand = true;
                break;
            case 'm-': // Memory Subtract
                calculator.memory -= inputValue;
                calculator.waitingForSecondOperand = true;
                break;
            case 'ms': // Memory Store
                calculator.memory = inputValue;
                calculator.waitingForSecondOperand = true;
                break;
        }
        
        updateDisplay();
    }

    function setBase(base) {
        if (calculator.currentBase === base) return;
        
        const currentValue = parseInput(calculator.displayValue);
        calculator.currentBase = base;
        
        // Enable/disable hex buttons based on the base
        hexButtons.forEach(btn => {
            if (base === 'hex') {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
        });
        
        // Update active state of base buttons
        baseBtns.forEach(btn => {
            if (btn.dataset.base === base) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Convert current value to the new base
        switch (base) {
            case 'hex':
                calculator.displayValue = Math.floor(currentValue).toString(16).toUpperCase();
                break;
            case 'dec':
                calculator.displayValue = currentValue.toString();
                break;
            case 'oct':
                calculator.displayValue = Math.floor(currentValue).toString(8);
                break;
            case 'bin':
                calculator.displayValue = Math.floor(currentValue).toString(2);
                break;
        }
        
        updateDisplay();
    }

    function performCalculation() {
        const { firstOperand, displayValue, operator } = calculator;
        const inputValue = parseInput(displayValue);
        
        if (isNaN(firstOperand) || isNaN(inputValue)) return NaN;
        
        let result;
        
        switch (operator) {
            case 'add':
                result = firstOperand + inputValue;
                break;
            case 'subtract':
                result = firstOperand - inputValue;
                break;
            case 'multiply':
                result = firstOperand * inputValue;
                break;
            case 'divide':
                if (inputValue === 0) {
                    setError("Cannot divide by zero");
                    return NaN;
                }
                result = firstOperand / inputValue;
                break;
            case 'power':
                result = Math.pow(firstOperand, inputValue);
                break;
            case 'mod':
                result = firstOperand % inputValue;
                break;
            case 'and':
                result = Math.floor(firstOperand) & Math.floor(inputValue);
                break;
            case 'or':
                result = Math.floor(firstOperand) | Math.floor(inputValue);
                break;
            case 'xor':
                result = Math.floor(firstOperand) ^ Math.floor(inputValue);
                break;
            case 'lsh':
                result = Math.floor(firstOperand) << Math.floor(inputValue);
                break;
            case 'rsh':
                result = Math.floor(firstOperand) >> Math.floor(inputValue);
                break;
            default:
                return firstOperand;
        }
        
        return result;
    }

    function parseInput(value) {
        // Handle different number bases
        if (calculator.currentBase === 'hex') {
            return parseInt(value, 16);
        } else if (calculator.currentBase === 'oct') {
            return parseInt(value, 8);
        } else if (calculator.currentBase === 'bin') {
            return parseInt(value, 2);
        }
        
        return parseFloat(value);
    }

    function formatResult(value) {
        if (isNaN(value)) return 'Error';
        
        // Handle different number bases
        if (calculator.currentBase === 'hex') {
            return Math.floor(value).toString(16).toUpperCase();
        } else if (calculator.currentBase === 'oct') {
            return Math.floor(value).toString(8);
        } else if (calculator.currentBase === 'bin') {
            return Math.floor(value).toString(2);
        }
        
        // For decimal, handle floating point precision
        if (Number.isInteger(value)) {
            return value.toString();
        } else {
            // Limit to reasonable decimal places to avoid floating point errors
            return value.toFixed(10).replace(/\.?0+$/, '');
        }
    }

    function factorial(n) {
        if (n === 0 || n === 1) return 1;
        
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    function resetCalculator() {
        calculator.displayValue = '0';
        calculator.firstOperand = null;
        calculator.waitingForSecondOperand = false;
        calculator.operator = null;
        historyDisplay.textContent = '';
    }

    function setCalculatorMode(mode) {
        calculator.currentMode = mode;
        
        // Update active state of mode buttons
        modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Show/hide keypad sections based on mode
        keypadSections.forEach(section => {
            if (section.classList.contains(`${mode}-keypad`)) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    }

    function setError(message) {
        calculator.displayValue = 'Error';
        display.classList.add('error');
        setTimeout(() => {
            display.classList.remove('error');
        }, 2000);
        console.error(message);
    }

    function updateDisplay() {
        display.textContent = calculator.displayValue;
    }

    function updateHistoryDisplay() {
        if (calculator.firstOperand !== null && calculator.operator !== null) {
            historyDisplay.textContent = `${formatResult(calculator.firstOperand)} ${getOperatorSymbol(calculator.operator)}`;
        }
    }

    function updateHistoryList() {
        historyList.innerHTML = '';
        
        calculator.history.forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const expression = document.createElement('div');
            expression.className = 'expression';
            expression.textContent = entry.expression;
            
            const result = document.createElement('div');
            result.className = 'result';
            result.textContent = entry.result;
            
            historyItem.appendChild(expression);
            historyItem.appendChild(result);
            historyList.appendChild(historyItem);
            
            // Add click event to reuse the result
            historyItem.addEventListener('click', () => {
                calculator.displayValue = entry.result;
                updateDisplay();
            });
        });
    }

    function getOperatorSymbol(op) {
        const symbols = {
            'add': '+',
            'subtract': '-',
            'multiply': '×',
            'divide': '÷',
            'power': '^',
            'mod': 'mod',
            'and': '&',
            'or': '|',
            'xor': '^',
            'lsh': '<<',
            'rsh': '>>'
        };
        
        return symbols[op] || op;
    }

    function saveHistory() {
        localStorage.setItem('calculatorHistory', JSON.stringify(calculator.history));
    }

    function saveSettings() {
        const settings = {
            mode: calculator.currentMode,
            isInRadMode: calculator.isInRadMode,
            isDarkMode: document.body.classList.contains('dark-mode')
        };
        
        localStorage.setItem('calculatorSettings', JSON.stringify(settings));
    }

    function loadHistory() {
        const savedHistory = localStorage.getItem('calculatorHistory');
        if (savedHistory) {
            calculator.history = JSON.parse(savedHistory);
            updateHistoryList();
        }
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('calculatorSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Set mode
            setCalculatorMode(settings.mode);
            
            // Set angle mode
            calculator.isInRadMode = settings.isInRadMode;
            
            // Set theme
            if (settings.isDarkMode) {
                document.body.classList.add('dark-mode');
                themeSwitch.checked = true;
            }
        }
    }

    // Initialization
    function init() {
        resetCalculator();
        loadHistory();
        loadSettings();
        updateDisplay();
    }

    init();
});
