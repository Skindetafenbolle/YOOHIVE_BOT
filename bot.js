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
            selMsg = 'be'
            sendCitySelectionKeyboard(chatId);
            break;
        case '🇵🇱 Polski':
            selMsg = 'pl'
            sendCitySelectionKeyboard(chatId);
            break;
        case '🇺🇦 Українська':
            selMsg = 'uk'
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
        case 'be':
            cityName = 'Выберыце горад';
            break;
        case 'pl':
            cityName = 'Wybierz miasto';
            break;
        case 'uk':
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
        const companyData = response.data;
        let insta = '';

        let messageText = `*${companyData.name}*\n\n`;
        if(companyData.description){
            messageText += `📝 ${companyData.description}\n`;
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
                messageText += `Фото: [Изображение](${imageUrl})\n`;
            }
            if (socialMediaMetadata && socialMediaMetadata.value && socialMediaMetadata.value.length > 0) {
                insta = socialMediaMetadata.value.find(link => link.includes('instagram.com'));
            }

            const companyLinkButton = { text: 'Перейти на сайт компании', url: `https://yoohive.pl/${encodeURIComponent(companyData.name)}` };
            const backButton = { text: 'Вернуться к выбору компании', callback_data: 'back_to_company_selection' };

            const inlineKeyboard = [];
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
            sendWarsawRegionsKeyboard(chatId, messageId, selMsg);
            break;
        case 'back_to_city_selection':
            sendCitySelectionKeyboard(chatId, messageId, selMsg);
            break;
        case 'back_to_region_selection':
            sendWarsawRegionsKeyboard(chatId, messageId, selMsg);
            break;
        case 'back_to_category_selection':
            sendCategoriesKeyboard(chatId, messageId, selMsg);
            break;
        case 'back_to_company_selection':
            search(chatId, messageId, subcategory, region, selMsg);
            break;
        case 'region_all':
            region = 'Warszawa';
            sendCategoriesKeyboard(chatId, messageId, selMsg);
            break;

    }
    if (data.startsWith('region_')) {
        if(data === 'region_All'){
            region = 'Warszawa';
        }
        else {
            region = data.replace('region_', '');
        }
        sendCategoriesKeyboard(chatId, messageId, selMsg);
    } else if (data.startsWith('company_')) {
        companyName = data.replace('company_', '');
        getCompanyByName(chatId, messageId, companyName);
    } else if (data.startsWith('category_')) {
        category = data.replace('category_', '');
        sendSubCategoriesKeyboard(chatId, messageId, category, selMsg);
    } else if (data.startsWith('subcategory_')) {
        subcategory = data.replace('subcategory_', '');
        search(chatId, messageId, subcategory, region, selMsg);
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

async function search(chatId, messageId, subcategory, region, selMsg) {
    let apiUrl = `${urlAPI}/api/company/search?categoryName=${encodeURIComponent(subcategory)}&city=${encodeURIComponent(region)}&page=1&perPage=20`;
    if (tags) {
        apiUrl += `&tags=${encodeURIComponent(tags.join(','))}`;
    }

    let textOtherCompanies, textChooseCompany, textNotFound, textBackCategory;

    switch (selMsg) {
        case 'ru':
            textOtherCompanies = 'Остальные компании';
            textChooseCompany = 'Выберите компанию';
            textNotFound = 'По вашему запросу ничего не найдено';
            textBackCategory = 'Вернуться к выбору подкатегории';
            break;
        case 'pl':
            textOtherCompanies = 'Inne firmy';
            textChooseCompany = 'Wybierz firmę';
            textNotFound = 'Nic nie znaleziono na Twoje żądanie';
            textBackCategory = 'Powrót do wyboru podkategorii';
            break;
        case 'uk':
            textOtherCompanies = 'Решта компаній';
            textChooseCompany = 'Виберіть компанію';
            textNotFound = 'За вашим запитом нічого не знайдено';
            textBackCategory = 'Повернутися до вибору підкатегорії';
            break;
        case 'be':
            textOtherCompanies = 'астатнія кампаніі';
            textChooseCompany = 'Выберыце кампанію';
            textNotFound = 'Нічога не знойдзена па Вашым запыце';
            textBackCategory = 'Вярнуцца да выбару падкатэгорыі';
            break;
        default:
            break;
    }

    try {
        const response = await axios.get(apiUrl);
        const companies = response.data.companies;
        if (companies.length === 0) {
            const options = {
                reply_markup: {
                    inline_keyboard: [[{ text: textBackCategory , callback_data: `category_${category}` }]],
                },
            };
            bot.editMessageText(textNotFound, {
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
            chunkedCompanies = chunkArray(companies, 10);
        } else {
            chunkedCompanies = chunkArray(companies, 1);
        }

        const columns = chunkedCompanies.map(chunk => {
            return chunk.map(company => ({
                text: String(company.name).trim(),
                callback_data: `company_${String(company.name).trim().substring(0, 32)}`,
            }));
        });

        const chunkedColumns = chunkArray(columns.flat(), 2);

        const inlineKeyboard = chunkedColumns.map(chunk => {
            const row = [];
            chunk.forEach(button => {
                row.push(button);
            });
            return row;
        });
        if(companies.length === 20) {
            inlineKeyboard.push([{ text: textOtherCompanies, url: `https://yoohive.pl/${subcategory}` }]);
        }
        inlineKeyboard.push([{ text: textBackCategory, callback_data: `category_${category}` }]);

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };
        bot.editMessageText(textChooseCompany, {
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

async function sendSubCategoriesKeyboard(chatId, messageId, category, selMsg) {
    const apiUrl = `${urlAPI}/api/category/sub/${category}`;
    let textChooseCategory = '';
    let textBackToCategorySelection = '';

    switch (selMsg) {
        case 'ru':
            textChooseCategory = 'Выберите категорию';
            textBackToCategorySelection = '⬅️Вернуться к выбору категории';
            break;
        case 'pl':
            textChooseCategory = 'Wybierz kategorię';
            textBackToCategorySelection = '⬅️Powrót do wyboru kategorii';
            break;
        case 'uk':
            textChooseCategory = 'Виберіть категорію';
            textBackToCategorySelection = '⬅️Вернуться до вибору категорії';
            break;
        case 'be':
            textChooseCategory = 'Выберыце катэгорыю';
            textBackToCategorySelection = '⬅️Вярнуцца да выбару катэгорыі';
            break;
        default:
            break;
    }

    try {
        const response = await axios.get(apiUrl);
        const subcategories = response.data;

        const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=${selMsg}&q=${subcategories}`;
        const translate = await axios.get(apiTranslate);
        const trans = translate.data;
        const translatedNames = trans[0][0][0].split(',');
        const chunkedServices = chunkArray(subcategories, 2);
        const inlineKeyboard = chunkedServices.map((column, columnIndex) => {
            return column.map((service, index) => ({
                text: translatedNames[columnIndex * 2 + index],
                callback_data: `subcategory_${service.trim()}`,
            }));
        });
        inlineKeyboard.push([{ text: textBackToCategorySelection, callback_data: 'back_to_category_selection' }]);
        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };

        bot.editMessageText(textChooseCategory, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: options.reply_markup,
        }).catch(error => {
            console.error('Error editing message text:', error);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

async function sendCategoriesKeyboard(chatId, messageId, selMsg) {
    const apiUrl = `${urlAPI}/api/category/all`;
    let textBackToRegionSelection = '';
    let textChooseCategory = '';
    switch (selMsg) {
        case 'ru':
            textBackToRegionSelection = '⬅️ Назад к выбору региона'
            textChooseCategory = 'Выберите категорию';
            break;
        case 'pl':
            textBackToRegionSelection = '⬅️ Powrót do wyboru regionu'
            textChooseCategory = 'Wybierz kategorię';
            break;
        case 'uk':
            textBackToRegionSelection = '⬅️ Назад до вибору регіону'
            textChooseCategory = 'Виберіть категорію';
            break;
        case 'be':
            textBackToRegionSelection = '️ ️⬅️ Назад да выбару рэгіёна'
            textChooseCategory = 'Выберыце катэгорыю';
            break;
        default:
            break;
    }


    try{
        const response = await axios.get(apiUrl);
        const categories = response.data;
        const category = categories.map(category => category.name)
        const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=eng&tl=${selMsg}&q=${category}`;
        const translate = await axios.get(apiTranslate);
        const trans = translate.data;
        const translatedNames = trans[0][0][0].split(',');
        const inlineKeyboard = categories.map((category, index) => {
            return [{ text: translatedNames[index], callback_data: `category_${category.name}` }];
        });
        inlineKeyboard.push([{ text: textBackToRegionSelection, callback_data: 'back_to_region_selection' }]);

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        };
        bot.editMessageText(textChooseCategory, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: options.reply_markup
        }).catch(error => {
            console.error('Error editing message text:', error);
        });
    }catch (e) {
        console.error(e)
    }

}

const regions = [
    'Mokotów', 'Ochota', 'Wola', 'Śródmieście', 'Żoliborz',
    'Wesoła', 'Wilanów', 'Bemowo', 'Białołęka', 'Bielany',
    'Rembertów', 'Targówek', 'Ursus', 'Ursynów', 'Wawer',
    'Praga Południe', 'Praga Północ', 'Włochy', 'All'
];

function sendWarsawRegionsKeyboard(chatId, messageId, selMsg) {
    let textBackToCitySelection = '';
    switch (selMsg) {
        case 'ru':
            textBackToCitySelection = '⬅️ Назад к выбору города'
            break;
        case 'pl':
            textBackToCitySelection = '⬅️ Powrót до wyboru регіону'
            break;
        case 'uk':
            textBackToCitySelection = '⬅️ Назад до вибору регіону'
            break;
        case 'be':
            textBackToCitySelection = '️ ️⬅️ Назад да выбару рэгіёна'
            break;
        case 'eng':
            textBackToCitySelection = '️ ️⬅️ Back to region sel'
            break;
        default:
            break;
    }
    try{
        const chunkedRegions = chunkArray(regions, 3);
        const inlineKeyboard = chunkedRegions.map(chunk => {
            return chunk.map(region => ({ text: region, callback_data: `region_${region}` }));
        });
        inlineKeyboard.push([{ text: textBackToCitySelection, callback_data: 'back' }]);

        const keyboard = {
            inline_keyboard: inlineKeyboard,
        };

        bot.editMessageReplyMarkup(keyboard, {
            chat_id: chatId,
            message_id: messageId
        }).catch(error => {
            console.error('Error editing message reply markup:', error);
        });
    }catch (e) {
        console.error(e)
    }
}