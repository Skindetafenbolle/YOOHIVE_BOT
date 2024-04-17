//Выбор Языка markup языка? c помощью inline_keyboard выбор города(Warszawa),
// выбор района (либо поиск по всему городу), выбор категории (Beauty) и выбор подкатегории

const TelegramBot = require('node-telegram-bot-api');

const token = '6863474147:AAE_jPXTgCLr2IYHYNgmzteTURB_9Jm5y5g';

const bot = new TelegramBot(token, { polling: true });
const axios = require('axios');

let chatState = {};
let selMsg;

function sendWelcomeMessage(chatId) {
    const welcomeMessage = `🇧🇾 Вітаю, гэта yoohivebot, выберы мову ніжэй, каб працягнуць на беларускай мове. З маёй дапамогай ты можаш адшукаць, паслугі, што цікавяць цябе, у сваім горадзе.\n\n` +
        `🇷🇺 Привет, это yoohivebot, выбери язын ниже, чтобы продолжить на русском языке. С моей помощью ты можешь найти, интересующие тебя услуги в своём городе.\n\n` +
        `🇵🇱 Cześć, tu yoohivebot, wybierz język poniżej, aby kontynuować po polsku. Z moją pomocą możesz znaleźć interesujące Cię usługi w swoim mieście.\n\n` +
        `🇺🇦 Привіт, це yoohivebot, вибери мову нижче, щоб продовжити українською мовою. З моєю допомогою ти можеш знайти послуги, які тебе цікавлять, у своєму місті.`;
    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            keyboard: [
                ['🇷🇺 Русский'],['🇧🇾 Беларуская'],
                ['🇵🇱 Polski'],['🇺🇦 Українська']
            ],
            one_time_keyboard: true,
            selective: true
        }
    });
}

bot.onText(/\/start$/, (msg) => {
    const chatId = msg.chat.id;
    chatState = {};

    sendWelcomeMessage(chatId);
});
bot.on('text', (msg) => {
    const chatId = msg.chat.id;
    const selectedLanguage = msg.text.trim();

    switch (selectedLanguage) {
        case '🇷🇺 Русский':
            selMsg = 'ru'
            sendCitySelectionKeyboard(chatId);
            break;
        case '🇧🇾 Беларуская':
            selMsg = 'by'
            sendCitySelectionKeyboard(chatId);
            break;
        case '🇵🇱 Polski':
            selMsg = 'pl'
            sendCitySelectionKeyboard(chatId);
            break;
        case '🇺🇦 Українська':
            selMsg = 'ua'
            sendCitySelectionKeyboard(chatId);
            break;
        default:
            break;
    }
});


function sendCitySelectionKeyboard(chatId, messageId) {
    let cityName;
    switch (selMsg) {
        case 'ru':
            cityName = 'Выберите город';
            break;
        case 'by':
            cityName = 'Выберыце горад';
            break;
        case 'pl':
            cityName = 'Wybierz miasto';
            break;
        case 'ua':
            cityName = 'Виберіть місто';
            break;
    }

    const messageText = `${cityName}`;

    if (chatState[chatId]) {
        bot.editMessageText(messageText, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Warszawa', callback_data: 'city_warszawa' }],
                ]
            }
        }).catch(error => {
            console.error('Error editing message text:', error);
        });
    } else {
        bot.sendMessage(chatId, messageText, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Warszawa', callback_data: 'city_warszawa' }],
                ]
            }
        }).then(sentMessage => {
            chatState[chatId] = { messageId: sentMessage.message_id };
        }).catch(error => {
            console.error('Error sending city selection keyboard:', error);
        });
    }
}

bot.on('callback_query', (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    switch (data) {
        case 'city_warszawa':
            sendWarsawRegionsKeyboard(chatId, messageId);
            break;
        case 'back_to_city_selection':
            sendCitySelectionKeyboard(chatId, messageId);
            break;
        case 'back_to_region_selection':
            sendWarsawRegionsKeyboard(chatId, messageId);
            break;
        case 'region_wola':
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'beauty':
            sendCategoriesKeyboard_API(chatId, messageId);
            break;
    }

    bot.answerCallbackQuery(callbackQuery.id);
});

async function sendCategoriesKeyboard_API(chatId, messageId) {
    const apiUrl = `https://yoohive-api-test-version.onrender.com/api/category/all`;
    try {
        const response = await axios.get(apiUrl);
        const categories = response.data;
        const inlineKeyboard = categories.map(category => ([{
            text: category.name,
            callback_data: category.slug,
        }]));

        inlineKeyboard.push([{ text: '⬅️ Назад к выбору категории', callback_data: 'region_wola' }]);

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            }
        };

        bot.editMessageText('Выберите категорию', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: options.reply_markup
        }).catch(error => {
            console.error('Error editing message text:', error);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}


function sendCategoriesKeyboard(chatId, messageId) {
    let options;
    switch (selMsg) {
        case 'ru':
            options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Красота', callback_data: 'beauty' }],
                        [{ text: 'Здоровье', callback_data: 'health' }],
                        [{ text: '⬅️ Назад к выбору категории', callback_data: 'back_to_region_selection' }],
                    ]
                }
            };
            bot.editMessageText('Выберите категорию', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: options.reply_markup
            }).catch(error => {
                console.error('Error editing message text:', error);
            });
            break;
        case 'pl':
            options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Uroda', callback_data: 'beauty' }],
                        [{ text: 'Zdrowie', callback_data: 'health' }],
                        [{ text: '⬅️ Назад к выбору городапл', callback_data: 'back_to_region_selection' }],
                    ]
                }
            };
            bot.editMessageText('Выберите категорию пл', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: options.reply_markup
            }).catch(error => {
                console.error('Error editing message text:', error);
            });
            break;
        case 'ua':
            options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Краса', callback_data: 'beauty' }],
                        [{ text: 'Здоров\'я', callback_data: 'health' }],
                        [{ text: '⬅️ Назад к выбору городауа', callback_data: 'back_to_region_selection' }],
                    ]
                }
            };
            bot.editMessageText('Выберите категорию уа', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: options.reply_markup
            }).catch(error => {
                console.error('Error editing message text:', error);
            });
            break;
        case 'by':
            options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Прыгажосць', callback_data: 'beauty' }],
                        [{ text: 'Здароўе', callback_data: 'health' }],
                        [{ text: '⬅️ Назад к выбору города бу', callback_data: 'back_to_region_selection' }],
                    ]
                }
            };
            bot.editMessageText('Выбери категорию бу', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: options.reply_markup
            }).catch(error => {
                console.error('Error editing message text:', error);
            });
            break;
    }
}


function sendWarsawRegionsKeyboard(chatId, messageId) {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Wola', callback_data: 'region_wola' }],
                [{ text: 'Mokotow', callback_data: 'region_mokotow' }],
                [{ text: 'Bemowo', callback_data: 'region_bemowo' }],
                [{ text: 'All', callback_data: 'region_all' }],
                [{ text: '⬅️ Назад к выбору города', callback_data: 'back_to_city_selection' }],
            ]
        }
    };

    let region;
    switch (selMsg){
        case 'ru':
            region = 'Выберите регион Варшавы'
            break;
        case 'pl':
            region = 'Wybierz region Warszawy'
            break;
        case 'ua':
            region = 'Виберіть регіон Варшави'
            break;
        case 'by':
            region = 'Выберыце рэгіён Варшавы'
            break;
    }

    const messageRegion = region
    bot.editMessageText(messageRegion, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: options.reply_markup
    }).catch(error => {
        console.error('Error editing message text:', error);
    });
}