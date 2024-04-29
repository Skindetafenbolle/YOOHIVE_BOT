const TelegramBot = require('node-telegram-bot-api');

const token = '6863474147:AAE_jPXTgCLr2IYHYNgmzteTURB_9Jm5y5g';

const bot = new TelegramBot(token, { polling: true });
const axios = require('axios');

let chatState = {};
let region;
let tags;
let category;
let selMsg;
let companyName;

function sendWelcomeMessage(chatId) {
    const welcomeMessage = `🇵🇱 Wybierz język poniżej, aby kontynuować po polsku.\n\n` +
        `🇧🇾 Выберы мову ніжэй, каб працягнуць на беларускай мове.\n\n` +
        `🇷🇺 Выбери язык ниже, чтобы продолжить на русском языке.\n\n` +
        `🇺🇦 Вибери мову нижче, щоб продовжити українською мовою.`;
    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            keyboard: [
                ['🇵🇱 Polski','🇧🇾 Беларуская'],
                ['🇷🇺 Русский','🇺🇦 Українська']
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

async function getCompanyByName(chatId, messageId, companyName) {
    console.log("Message ID:", messageId);

    let apiUrl = `https://yoohive-api-test-version.onrender.com/api/company/name/${companyName}`;
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
        case 'beauty':
            sendCategoriesKeyboard_API(chatId, messageId);
            break;
        case 'region_Mokotów':
            region = 'Mokotów';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Ochota':
            region = 'Ochota';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Wola':
            region = 'Wola';
            console.log(region)
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Śródmieście':
            region = 'Śródmieście';
            console.log(region)
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Żoliborz':
            region = 'Żoliborz';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Południe':
            region = 'Praga Południe';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Północ':
            region = 'Praga Północ';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_bemowo':
            region = 'Bemowo';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Białołęka':
            region = 'Białołęka';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Bielany':
            region = 'Bielany';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Rembertów':
            region = 'Rembertów';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Targówek':
            region = 'Targówek';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Ursus':
            region = 'Ursus';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Ursynów':
            region = 'Ursynów';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Wawer':
            region = 'Wawer';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Wesoła':
            region = 'Wesoła';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Wilanów':
            region = 'Wilanów';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_Włochy':
            region = 'Włochy';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'region_all':
            region = 'Warszawa';
            sendCategoriesKeyboard(chatId, messageId);
            break;
        case 'back_to_company_selection':
            search(chatId, messageId, category, region);
            break;
        case 'back_to_category_selection':
            sendCategoriesKeyboard(chatId, messageId);
            break;
    }
    if (data.startsWith('company_')) {
        companyName = data.replace('company_', '');
        console.log(companyName)
        getCompanyByName(chatId, messageId, companyName);
    } else if (data.startsWith('category_')) {
        category = data.replace('category_', '');
        console.log(category)
        search(chatId, messageId, category, region);
    }

    bot.answerCallbackQuery(callbackQuery.id);
});

async function search(chatId, messageId, category, region) {
    let apiUrl = `https://yoohive-api-test-version.onrender.com/api/company/search?categoryName=${encodeURIComponent(category)}&city=${encodeURIComponent(region)}&page=1&perPage=10`;
    console.log(category);
    if (tags) {
        apiUrl += `&tags=${encodeURIComponent(tags.join(','))}`;
    }

    function chunkArray(array, size) {
        const chunkedArr = [];
        for (let i = 0; i < array.length; i += size) {
            chunkedArr.push(array.slice(i, i + size));
        }
        return chunkedArr;
    }
    try {
        console.log(apiUrl);
        const response = await axios.get(apiUrl);
        const companies = response.data.companies;
        console.log(companies)
        const chunkedCompanies = chunkArray(companies, 5);

        const columns = chunkedCompanies.map(chunk => {
            return chunk.map(company => ({
                text: String(company.name).trim(),
                callback_data: `company_${String(company.name).trim()}`,
            }));
        });

        const inlineKeyboard = [];

        if (columns[0] && columns[1]) {
            const maxLength = Math.max(columns[0].length, columns[1].length);

            for (let i = 0; i < maxLength; i++) {
                const row = [];
                if (columns[0][i]) {
                    row.push(columns[0][i]);
                }
                if (columns[1][i]) {
                    row.push(columns[1][i]);
                }
                inlineKeyboard.push(row);
            }
        }

        inlineKeyboard.push([{ text: '⬅️', callback_data: 'beauty' }]);
        inlineKeyboard.push([{ text: 'Остальные компании', url: `https://yoohive.pl/${category}` }]);

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

async function sendCategoriesKeyboard_API(chatId, messageId) {
    const apiUrl = `https://yoohive-api-test-version.onrender.com/api/category/all`;
    function chunkArray(array, size) {
        const chunkedArr = [];
        for (let i = 0; i < array.length; i += size) {
            chunkedArr.push(array.slice(i, i + size));
        }
        return chunkedArr;
    }
    switch (selMsg){
        case 'ru':
            try {
                const response = await axios.get(apiUrl);
                const categories = response.data.slice(0, 9);
                console.log(categories)
                const categoryNames = categories.map(category => category.name);
                const categoryNamesString = categoryNames.join(',');
                console.log(categoryNamesString);
                const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=ru&q=${categoryNamesString}`;
                const translate = await axios.get(apiTranslate);
                const trans = translate.data;
                const translatedNames = trans[0][0][0].split(',');
                console.log(translatedNames)
                const chunkedServices = chunkArray(categoryNames, 2);
                const inlineKeyboard = chunkedServices
                    .map((column, columnIndex) => {
                        return column
                            .filter(service => service !== 'withoutCategory')
                            .map((service, index) => ({
                                text: translatedNames[columnIndex * 2 + index],
                                callback_data: `category_${service.trim()}`,
                            }));
                    });
                inlineKeyboard.push([{ text: '⬅️ Назад к выбору категории', callback_data: 'back_to_category_selection' }]);
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

function sendCategoriesKeyboard(chatId, messageId) {
    let options;
    switch (selMsg) {
        case 'ru':
            options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Красота', callback_data: 'beauty' }],
                        [{ text: 'Здоровье', callback_data: 'health' }],
                        [{ text: '⬅️ Назад к выбору региона', callback_data: 'back_to_region_selection' }],
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

function sendWarsawRegionsKeyboard(chatId, messageId) {
    let keyboard = {
        inline_keyboard: [
            [
                { text: 'Mokotów', callback_data: 'region_Mokotów' },
                { text: 'Ochota', callback_data: 'region_Ochota' },
                { text: 'Wola', callback_data: 'region_Wola' },
                { text: 'Śródmieście', callback_data: 'region_Śródmieście' },
                { text: 'Żoliborz', callback_data: 'region_Żoliborz' }
            ],
            [
                { text: 'Wesoła', callback_data: 'region_Wesoła' },
                { text: 'Wilanów', callback_data: 'region_Wilanów' },
                { text: 'Bemowo', callback_data: 'region_bemowo' },
                { text: 'Białołęka', callback_data: 'region_Białołęka' },
                { text: 'Bielany', callback_data: 'region_Bielany' }
            ],
            [
                { text: 'Rembertów', callback_data: 'region_Rembertów' },
                { text: 'Targówek', callback_data: 'region_Targówek' },
                { text: 'Ursus', callback_data: 'region_Ursus' },
                { text: 'Ursynów', callback_data: 'region_Ursynów' },
                { text: 'Wawer', callback_data: 'region_Wawer' }
            ],
            [
                { text: 'Praga Południe', callback_data: 'region_Południe' },
                { text: 'Praga Północ', callback_data: 'region_Północ' },
                { text: 'Włochy', callback_data: 'region_Włochy' }
            ],
            [
                { text: 'All', callback_data: 'region_all' }
            ],
            [
                { text: '⬅️ Назад к выбору города', callback_data: 'back_to_city_selection' }
            ]
        ]
    };

    bot.editMessageReplyMarkup(keyboard, {
        chat_id: chatId,
        message_id: messageId
    }).catch(error => {
        console.error('Error editing message reply markup:', error);
    });
}
