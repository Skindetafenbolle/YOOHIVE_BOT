const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token);
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

let userStates = {};

bot.setWebHook(`https://b173-77-91-102-66.ngrok-free.app//${token}`);

app.post(`/${token}`, (req, res) => {
    console.log("Received POST request:", req.body);
    // bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get('/hello', (req, res) => {
    res.json('Hello');
})
function sendWelcomeMessage(chatId) {
    const welcomeMessage = `🚩 Вітаю, гэта yoohivebot, напішы каманду /startbel, каб працягнуць на беларускай мове. З маёй дапамогай ты можаш адшукаць, паслугі, што цікавяць цябе, у сваім горадзе.\n\n` +
        `🚩 Привет, это yoohivebot, напиши команду /startru, чтобы продолжить на русском языке. С моей помощью ты можешь найти, интересующие тебя услуги в своём городе.\n\n` +
        `🚩 Witaj, tu yoohivebot, napisz komendę /startpol aby kontynuować po polsku. Z moją pomocą możesz znaleźć interesujące Cię usługi w swoim mieście.\n\n` +
        `🚩 Привіт, це yoohivebot, напиши команду /startua, щоб продовжити українською мовою. З моєю допомогою ти можеш знайти послуги, які тебе цікавлять, у своєму місті.`;
    bot.sendMessage(chatId, welcomeMessage);
}

const messages = {
    cityRequest: {
        'bel': "У якім горадзе шукаеш паслугі?",
        'ru': "В каком городе ищешь услуги?",
        'pol': "W jakim mieście szukasz usług?",
        'ua': "У якому місті шукаєш послуги?"
    },
    enterService: {
        'bel': "Напішы што шукаеш, напрыклад \"Барбершоп\"",
        'ru': "Напиши, что ищешь, например\"Барбершоп\"",
        'pol': "Napisz, czego szukasz, na przykład \"Barbershop\"",
        'ua': "Напиши, що шукаєш, наприклад \"Барбершоп\""
    },
    noResults: {
        'bel': "Выбачай, але на твой запыт нічога не знайшлося. Паспрабуй праз некалькі дзён, мы абавязкова штосьці знойдзем для цябе і дадамо ў наш бот",
        'ru': "Извини, но по твоему запросу ничего не найдено.  Попробуй через несколько дней, мы обязательно найдем что-то для тебя и добавим в наш бот.",
        'pol': "Przepraszamy, ale nic nie znaleziono dla Twojego zapytania.  Spróbuj ponownie za kilka dni, na pewno znajdziemy coś dla Ciebie i dodamy to do naszego bota",
        'ua': "Вибач, але за твоїм запитом нічого не знайдено. Спробуй через кілька днів, ми обов'язково знайдемо щось для тебе і додамо в наш бот"
    },
    errorOccurred: {
        'bel': "Произошла ошибка на сервере при поиске услуг.",
        'ru': "Произошла ошибка на сервере при поиске услуг.",
        'pol': "Wystąpił błąd na serwerze podczas wyszukiwania usług.",
        'ua': "Сталася помилка на сервері під час пошуку послуг."
    },
    findServices: {
        'bel': 'Знойдзеныя паслугі',
        'ru': "Найденные услуги",
        'pol': "Znalezione usługi",
        'ua': "Знайдені послуги"
    },
    choose: {
        'bel': 'Калі патрэбна, адзнач наступныя опцыі ',
        'ru': "При необходимости отметь следующие опции ",
        'pol': "W razie potrzeby zaznacz następujące opcje ",
        'ua': "За необхідності відзнач такі опції "
    },
    choose2: {
        'bel': 'Напішыце тэгі праз прабел або націсніце кнопку ніжэй',
        'ru': "Напишите теги через пробел или нажмите кнопку ниже",
        'pol': "Wpisz tagi w odpowiednie miejsce lub kliknij poniższy przycisk",
        'ua': "Напишіть теги через пробіл або натисніть кнопку нижче"
    },
    button: {
        'bel': 'Прапустіць',
        'ru': 'Пропустить',
        'pol': 'Pominięcie',
        'ua': 'Пропустити'
    },
    inclusive: {
        'bel': 'калі патрэбныя спецыяльныя умовы для асоб з інваліднасцю',
        'ru': 'если необходимы специальные условия для людей с инвалидностью',
        'pol': 'jeśli potrzebujesz specjalnych udogodnień dla osób niepełnosprawnych',
        'ua': 'якщо необхідні спеціальні умови для людей з інвалідністю'
    },
    pet: {
        'bel': 'калі табе патрэбныя умовы для гадаванцаў',
        'ru': 'если вам нужны условия для домашних животных',
        'pol': 'jeśli potrzebujesz udogodnień dla zwierząt',
        'ua': 'якщо вам потрібні умови для домашніх тварин'
    },
    child: {
        'bel': 'калі патрабуюцца забавы для дзяцей',
        'ru': 'когда требуются развлечение для детей',
        'pol': 'jeśli potrzebujesz rozrywki dla dzieci',
        'ua': 'коли потрібні розваги для дітей'
    },
    eco: {
        'bel': 'калі шукаеш максімальна экалагічны сэрвіс',
        'ru': 'если вы ищете максимально экологичный сервис',
        'pol': 'jeśli szukasz usługi możliwie najbardziej przyjaznej dla środowiska',
        'ua': 'якщо ви шукаєте максимально екологічний сервіс'
    }
};

bot.onText(/\/start$/, (msg) => {
    const chatId = msg.chat.id;
    sendWelcomeMessage(chatId);
});

bot.onText(/\/start(bel|ru|pol|ua)$/, (msg, match) => {
    const chatId = msg.chat.id;
    const lang = match[1];
    userStates[chatId] = { lang: lang, stage: 'city' };

    bot.sendMessage(chatId, messages.cityRequest[lang]);
});

async function searchServices(query, city, tags, chatId) {
    try {
        let apiUrl = `https://yoohive-api-test-version.onrender.com/api/company/search?categoryName=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}&page=1&perPage=5`;
        const skipButton = messages.button[userStates[chatId].lang].trim();
        console.log(skipButton);
        if (tags && !tags.includes(skipButton)) {
            apiUrl += `&tags=${encodeURIComponent(tags.join(','))}`;
        }

        const response = await axios.get(apiUrl);
        console.log(apiUrl);
        console.log(response.data)
        if (response.status === 200 && response.data.companies.length > 0) {
            const companies = response.data.companies;
            return companies.map(company => {
                const phoneMetadata = company.companymetadatums.find(metadata => metadata.type === 'phones');

                const phone = phoneMetadata ? phoneMetadata.value.join(', ') : 'Нет номера телефона';

                return `🚩${company.name}: \n ${phone}  \n${company.address || 'Нет описания'}`;
            }).join('\n\n');
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return messages.noResults[userStates[chatId].lang];
        }

        console.error('Ошибка при поиске:', error);
        return messages.errorOccurred[userStates[chatId].lang];
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.text.startsWith('/')) return;

    const userState = userStates[chatId];
    if (!userState) return;

    switch (userState.stage) {
        case 'city':
            userState.city = msg.text;
            userState.stage = 'tags';
            bot.sendMessage(chatId, `${messages.choose[userState.lang]}:\n🤝🏻 inclusive - ${messages.inclusive[userState.lang]}\n🐶🐱 petfriendly - ${messages.pet[userState.lang]} \n👧🏻👦🏻 childfriendly - ${messages.child[userState.lang]}\n🌍 ecofriendly - ${messages.eco[userState.lang]}\n ${messages.choose2[userState.lang]}.`, {
                reply_markup: {
                    keyboard: [[messages.button[userState.lang]]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
            break;
        case 'tags':
            const tags = msg.text.split(' ');
            userState.tags = tags;
            userState.stage = 'search';
            bot.sendMessage(chatId, messages.enterService[userState.lang]);
            break;
        case 'search':
            const servicesMessage = await searchServices(msg.text, userState.city, userState.tags, chatId);
            if (servicesMessage && servicesMessage.length > 0) {
                bot.sendMessage(chatId, messages.findServices[userState.lang] + `:\n${servicesMessage}`);
            } else {
                bot.sendMessage(chatId, messages.noResults[userState.lang] || "По вашему запросу ничего не найдено.");
            }
            userState.stage = 'done';
            break;
    }
});

bot.onText(/skip/, (msg) => {
    const chatId = msg.chat.id;
    const userState = userStates[chatId];
    if (!userState) return;

    userState.stage = 'search';
    bot.sendMessage(chatId, messages.enterService[userState.lang]);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Telegram bot is running.`);
});
