const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');

dotenv.config();
const urlAPI = process.env.URL_API;
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const axios = require('axios');

let chatState = {};
let region;
let tags;
let category;
let subcategory;
let selMsg;
let companyName;

function sendWelcomeMessage(chatId) {
    const welcomeMessage = `🇵🇱 Wybierz język poniżej, aby kontynuować po polsku.\n\n` +
        `🇧🇾 Выберы мову ніжэй, каб працягнуць на беларускай мове.\n\n` +
        `🇷🇺 Выбери язык ниже, чтобы продолжить на русском языке.\n\n` +
        `🇺🇦 Вибери мову нижче, щоб продовжити українською мовою.\n\n` +
        `🇬🇧 Select a language below to continue in English.`;
    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            keyboard: [
                ['🇬🇧 English','🇧🇾 Беларуская'],
                ['🇷🇺 Русский','🇺🇦 Українська'],
                ['🇵🇱 Polski']
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
        case '🇬🇧 English':
            selMsg = 'eng'
            sendCitySelectionKeyboard(chatId);
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
        case 'eng':
            cityName = 'Choose place';
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

async function getCompanyByName(chatId, messageId, companyName) {

    let apiUrl = `${urlAPI}/api/company/name/${companyName}`;
    try {
        const response = await axios.get(apiUrl);
        console.log(apiUrl)
        const companyData = response.data;
        let insta = '';

        let messageText = `*${companyData.name}*\n\n`;
        if(companyData.description){
            messageText += `📝 ${companyData.description || 'Н/Д'}\n`;
        }
        messageText += `📍 ${companyData.address || 'Н/Д'}\n\n`;

        if (companyData.companymetadatums && companyData.companymetadatums.length > 0) {
            const socialMediaMetadata = companyData.companymetadatums.find(metadata => metadata.type === 'socialMediaLinks');
            const images = companyData.companymetadatums.find(metadata => metadata.type === 'images');
            const phones = companyData.companymetadatums.find(metadata => metadata.type === 'phones');
            const phoneNumbers = phones.value.join(', ');
            messageText += `☎️ ${phoneNumbers}\n`;
            if (images && images.value && images.value.length > 0) {
                const imageUrl = images.value[0];
                const inlineKeyboard = [];
                messageText += `Фото: [Изображение](${imageUrl})\n`;
                if (socialMediaMetadata && socialMediaMetadata.value && socialMediaMetadata.value.length > 0) {
                    insta = socialMediaMetadata.value.find(link => link.includes('instagram.com'));
                }

                const companyLinkButton = { text: 'Перейти на сайт компании', url: `https://yoohive.pl/${encodeURIComponent(companyData.name)}` };
                const backButton = { text: 'Вернуться к выбору компании', callback_data: 'back_to_company_selection' };

                let inlineKeyboardRow = [];
                if (insta) {
                    const instaButton = { text: 'Instagram 📸', url: insta };
                    inlineKeyboardRow.push(instaButton);
                }
                inlineKeyboardRow.push(companyLinkButton);
                inlineKeyboard.push(inlineKeyboardRow);
                inlineKeyboard.push([backButton]);

                await bot.editMessageText(messageText, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: inlineKeyboard }
                });
            }
        }

    } catch (error) {
        console.error(error);
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
        case 'back_to_category_selection':
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'back_to_company_selection':
            search(chatId, messageId, subcategory, region);
            break;
        case 'region_all':
            region = 'Warszawa';
            sendCategoriesKeyboard(chatId, messageId);
            break;

    }
    if (data.startsWith('region_')) {
        region = data.replace('region_', '');
        sendCategoriesKeyboard(chatId, messageId);
        console.log(region)
    } else if (data.startsWith('company_')) {
        companyName = data.replace('company_', '');
        console.log(companyName)
        getCompanyByName(chatId, messageId, companyName);
    } else if (data.startsWith('category_')) {
        category = data.replace('category_', '');
        console.log(category)
        sendSubCategoriesKeyboard(chatId, messageId, category);
    } else if (data.startsWith('subcategory_')) {
        subcategory = data.replace('subcategory_', '');
        console.log(subcategory)
        search(chatId, messageId, subcategory, region);
    }

    bot.answerCallbackQuery(callbackQuery.id);
});
function chunkArray(array, size) {
    const chunkedArr = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
}
async function search(chatId, messageId, subcategory, region) {
    let apiUrl = `${urlAPI}/api/company/search?categoryName=${encodeURIComponent(subcategory)}&city=${encodeURIComponent(region)}&page=1&perPage=10`;
    console.log(subcategory);
    if (tags) {
        apiUrl += `&tags=${encodeURIComponent(tags.join(','))}`;
    }
    try {
        console.log(apiUrl);
        const response = await axios.get(apiUrl);
        const companies = response.data.companies;
        console.log(companies);

        if (companies.length === 0) {
            const options = {
                reply_markup: {
                    inline_keyboard: [[{ text: '⬅️', callback_data: `category_${category}` }]],
                },
            };
            bot.editMessageText('По вашему запросу ничего не найдено', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: options.reply_markup,
            }).catch(error => {
                console.error('Error editing message text:', error);
            });
            return;
        }

        let chunkedCompanies;
        if (companies.length > 5) {
            chunkedCompanies = chunkArray(companies, 5);
        } else {
            chunkedCompanies = chunkArray(companies, 1);
        }

        const columns = chunkedCompanies.map(chunk => {
            return chunk.map(company => ({
                text: String(company.name).trim(),
                callback_data: `company_${String(company.name).trim()}`,
            }));
        });

        const chunkedColumns = chunkArray(columns.flat(), 2); // Разбиваем все кнопки на пары

        const inlineKeyboard = chunkedColumns.map(chunk => {
            const row = [];
            chunk.forEach(button => {
                row.push(button);
            });
            return row;
        });

        inlineKeyboard.push([{ text: 'Остальные компании', url: `https://yoohive.pl/${subcategory}` }]);
        inlineKeyboard.push([{ text: '⬅️', callback_data: `category_${category}` }]);

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };

        bot.editMessageText('Выберите компанию', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: options.reply_markup,
        }).catch(error => {
            console.error('Error editing message text:', error);
        });
    } catch (e) {
        console.error(e);
    }
}

async function sendSubCategoriesKeyboard(chatId, messageId, category) {
    const apiUrl = `${urlAPI}/api/category/sub/${category}`;

    switch (selMsg){
        case 'ru':
            try {
                const response = await axios.get(apiUrl);
                const subcategories = response.data
                console.log(subcategories)

                const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=ru&q=${subcategories}`;
                const translate = await axios.get(apiTranslate);
                const trans = translate.data;
                const translatedNames = trans[0][0][0].split(',');
                console.log(translatedNames)
                const chunkedServices = chunkArray(subcategories, 2);
                const inlineKeyboard = chunkedServices
                    .map((column, columnIndex) => {
                        return column
                            .map((service, index) => ({
                                text: translatedNames[columnIndex * 2 + index],
                                callback_data: `subcategory_${service.trim()}`,
                            }));
                    });
                inlineKeyboard.push([{ text: '⬅️ Назад к выбору подкатегории', callback_data: 'back_to_category_selection' }]);
                const options = {
                    reply_markup: {
                        inline_keyboard: inlineKeyboard,
                    },
                };

                bot.editMessageText('Выберите категорию', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: options.reply_markup,
                }).catch(error => {
                    console.error('Error editing message text:', error);
                });
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
            break;
        case 'pl':
            try {
                const response = await axios.get(apiUrl);
                const categories = response.data;

                const categoryNames = categories.map(category => category.name);
                const categoryNamesString = categoryNames.join(',');

                const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=pl&q=${categoryNamesString}`;
                const translate = await axios.get(apiTranslate);
                const trans = translate.data;
                const translatedNames = trans[0][0][0].split(',');
                console.log(translatedNames)
                const chunkedServices = chunkArray(categoryNames, 2);
                const inlineKeyboard = chunkedServices
                    .map((column, columnIndex) => {
                        return column
                            .filter(service => service !== 'bezkategorii')
                            .map((service, index) => ({
                                text: translatedNames[columnIndex * 2 + index],
                                callback_data: service.trim(),
                            }));
                    });
                inlineKeyboard.push([{ text:'⬅️ Powrót do wyboru kategorii', callback_data: 'back_to_category_selection' }]);

                const options = {
                    reply_markup: {
                        inline_keyboard: inlineKeyboard,
                    }
                };

                bot.editMessageText('Wybierz kategorię', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: options.reply_markup
                }).catch(error => {
                    console.error('Error editing message text:', error);
                });
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
            break;
        case 'ua':
            try {
                const response = await axios.get(apiUrl);
                const categories = response.data;

                const categoryNames = categories.map(category => category.name);
                const categoryNamesString = categoryNames.join(',');

                const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=uk&q=${categoryNamesString}`;
                const translate = await axios.get(apiTranslate);
                const trans = translate.data;
                const newS = trans[0][0][0].split(',');

                const chunkedServices = chunkArray(newS, 2);
                const inlineKeyboard = chunkedServices
                    .map(column => {
                        return column
                            .filter(service => service !== 'без категорії')
                            .map(service => ({
                                text: service.trim(),
                                callback_data: service.trim(),
                            }));
                    });

                inlineKeyboard.push([{ text:'⬅️ Назад до вибору категорії', callback_data: 'back_to_category_selection' }]);

                const options = {
                    reply_markup: {
                        inline_keyboard: inlineKeyboard,
                    }
                };

                bot.editMessageText('Виберіть категорію', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: options.reply_markup
                }).catch(error => {
                    console.error('Error editing message text:', error);
                });
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
            break;
        case 'by':
            try {
                const response = await axios.get(apiUrl);
                const categories = response.data;

                const categoryNames = categories.map(category => category.name);
                const categoryNamesString = categoryNames.join(',');

                const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=be&q=${categoryNamesString}`;
                const translate = await axios.get(apiTranslate);
                const trans = translate.data;
                const newS = trans[0][0][0].split(',');

                const chunkedServices = chunkArray(newS, 2);
                const inlineKeyboard = chunkedServices
                    .map(column => {
                        return column
                            .filter(service => service !== 'безКатэгорыі')
                            .map(service => ({
                                text: service.trim(),
                                callback_data: service.trim(),
                            }));
                    });

                inlineKeyboard.push([{ text:'⬅️ Назад да выбару катэгорыі', callback_data: 'back_to_category_selection' }]);

                const options = {
                    reply_markup: {
                        inline_keyboard: inlineKeyboard,
                    }
                };

                bot.editMessageText('Выберыце катэгорыю', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: options.reply_markup
                }).catch(error => {
                    console.error('Error editing message text:', error);
                });
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
            break;
    }
}

async function sendCategoriesKeyboard(chatId, messageId) {
    let options;
    const apiUrl = `${urlAPI}/api/category/all`;
    switch (selMsg) {
        case 'ru':
            try{
                const response = await axios.get(apiUrl);
                const categories = response.data;
                const category = categories.map(category => category.name)
                const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=ru&q=${category}`;
                const translate = await axios.get(apiTranslate);
                const trans = translate.data;
                const translatedNames = trans[0][0][0].split(',');
                console.log(translatedNames)
                const inlineKeyboard = categories.map((category, index) => {
                    return [{ text: translatedNames[index], callback_data: `category_${category.name}` }];
                });
                inlineKeyboard.push([{ text: '⬅️ Назад к выбору региона', callback_data: 'back_to_region_selection' }]);

                const options = {
                    reply_markup: {
                        inline_keyboard: inlineKeyboard
                    }
                };
                bot.editMessageText('Выберите категорию', {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: options.reply_markup
                }).catch(error => {
                    console.error('Error editing message text:', error);
                });
            }catch (e) {
                console.error(e)
            }
            break;
        case 'pl':
            options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Uroda', callback_data: 'beauty' }],
                        [{ text: 'Zdrowie', callback_data: 'health' }],
                        [{ text: '⬅️ Powrót do wyboru regionu', callback_data: 'back_to_region_selection' }],
                    ]
                }
            };
            bot.editMessageText('Wybierz kategorię', {
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
                        [{ text: '⬅️ Назад до вибору регіону', callback_data: 'back_to_region_selection' }],
                    ]
                }
            };
            bot.editMessageText('Виберіть категорію', {
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
                        [{ text: '⬅️ Назад да выбару рэгіёну', callback_data: 'back_to_region_selection' }],
                    ]
                }
            };
            bot.editMessageText('Выберыце катэгорыю', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: options.reply_markup
            }).catch(error => {
                console.error('Error editing message text:', error);
            });
            break;
    }
}

const regions = [
    'Mokotów', 'Ochota', 'Wola', 'Śródmieście', 'Żoliborz',
    'Wesoła', 'Wilanów', 'Bemowo', 'Białołęka', 'Bielany',
    'Rembertów', 'Targówek', 'Ursus', 'Ursynów', 'Wawer',
    'Praga Południe', 'Praga Północ', 'Włochy', 'All'
];

function sendWarsawRegionsKeyboard(chatId, messageId) {
    const chunkedRegions = chunkArray(regions, 3);
    const inlineKeyboard = chunkedRegions.map(chunk => {
        return chunk.map(region => ({ text: region, callback_data: `region_${region}` }));
    });
    inlineKeyboard.push([{ text: '⬅️ Назад к выбору города', callback_data: 'back_to_city_selection' }]);

    const keyboard = {
        inline_keyboard: inlineKeyboard,
    };

    bot.editMessageReplyMarkup(keyboard, {
        chat_id: chatId,
        message_id: messageId
    }).catch(error => {
        console.error('Error editing message reply markup:', error);
    });
}