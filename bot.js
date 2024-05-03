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

const regions = [
    'Mokotów', 'Ochota', 'Wola', 'Śródmieście', 'Żoliborz',
    'Wesoła', 'Wilanów', 'Bemowo', 'Białołęka', 'Bielany',
    'Rembertów', 'Targówek', 'Ursus', 'Ursynów', 'Wawer',
    'Praga Południe', 'Praga Północ', 'Włochy', 'All'
];

function sendWelcomeMessage(chatId) {
    const welcomeMessage = `🇵🇱 Wybierz język poniżej, aby kontynuować w języku polskim.\n\n` +
        `🇧🇾 Выберыце мову ніжэй, каб працягнуць на беларускай мове.\n\n` +
        `🇷🇺 Выберите язык ниже, чтобы продолжить на русском языке.\n\n` +
        `🇺🇦 Виберіть мову нижче, щоб продовжити українською мовою.\n\n` +
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
        case 'back_to_subcategory_selection':
            sendSubCategoriesKeyboard(chatId, messageId, category, selMsg);
            break;
        case 'back_to_tags_selection':
            sendSpecialTags(chatId, messageId, selMsg);
            break;
        case 'back_to_company_selection':
            if(tags){
                search(chatId, messageId, subcategory, region, selMsg, tags);
            }
            search(chatId, messageId, subcategory, region, selMsg);
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
        getCompanyByName(chatId, messageId, companyName, selMsg);
    } else if (data.startsWith('category_')) {
        category = data.replace('category_', '');
        sendSubCategoriesKeyboard(chatId, messageId, category, selMsg);
    } else if (data.startsWith('subcategory_')) {
        subcategory = data.replace('subcategory_', '');
        sendSpecialTags(chatId, messageId, selMsg)
    } else if (data.startsWith('tag_')) {
        if(data === 'tag_none'){
            search(chatId, messageId, subcategory, region, selMsg);
        }
        else {
            tags = data.replace('tag_', '');
            console.log(tags)
            search(chatId, messageId, subcategory, region, selMsg, tags);
        }
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

async function sendCitySelectionKeyboard(chatId, messageId) {
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
            cityName = 'Select a city';
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

async function sendWarsawRegionsKeyboard(chatId, messageId, selMsg) {
    let textBackToCitySelection = '';
    let textChooseRegion = ''
    switch (selMsg) {
        case 'ru':
            textBackToCitySelection = '⬅️ Назад к выбору города'
            textChooseRegion = 'Выберите район'
            break;
        case 'pl':
            textBackToCitySelection = '⬅️ Powrót do wyboru miasta'
            textChooseRegion = 'Wybierz dzielnicę'
            break;
        case 'uk':
            textBackToCitySelection = '⬅️ Назад до вибору міста'
            textChooseRegion = 'Виберіть регіон'
            break;
        case 'be':
            textBackToCitySelection = '️ ️⬅️ Вярнуцца да выбару гораду'
            textChooseRegion = 'Выберыце раён'
            break;
        case 'eng':
            textBackToCitySelection = '⬅️ Back to city selection'
            textChooseRegion = 'Select a district'
            break;
        default:
            break;
    }
    try{
        const chunkedRegions = chunkArray(regions, 3);
        const inlineKeyboard = chunkedRegions.map(chunk => {
            return chunk.map(region => ({ text: region, callback_data: `region_${region}` }));
        });
        inlineKeyboard.push([{ text: textBackToCitySelection, callback_data: 'back_to_city_selection' }]);

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };

        await bot.editMessageText(textChooseRegion, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: options.reply_markup,
        });
    }catch (e) {
        console.error(e)
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
            textBackToRegionSelection = '⬅️ Powrót do wyboru dzielnicy'
            textChooseCategory = 'Wybierz kategorię';
            break;
        case 'uk':
            textBackToRegionSelection = '⬅️ Назад до вибору регіону'
            textChooseCategory = 'Виберіть категорію';
            break;
        case 'be':
            textBackToRegionSelection = '️ ️⬅️ Вярнуцца да выбару рэгіёну'
            textChooseCategory = 'Выберыце катэгорыю';
            break;
        case 'eng':
            textBackToRegionSelection = '⬅️ Back to selecting a district'
            textChooseCategory = 'Select a category';
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

async function sendSubCategoriesKeyboard(chatId, messageId, category, selMsg) {
    const apiUrl = `${urlAPI}/api/category/sub/${category}`;
    let textChooseCategory = '';
    let textBackToCategorySelection = '';

    switch (selMsg) {
        case 'ru':
            textChooseCategory = 'Выберите подкатегорию';
            textBackToCategorySelection = '⬅️ Назад к выбору категории';
            break;
        case 'pl':
            textChooseCategory = 'Wybór podkategorii';
            textBackToCategorySelection = '⬅️ Powrót do wyboru kategorii';
            break;
        case 'uk':
            textChooseCategory = 'Виберіть підкатегорію';
            textBackToCategorySelection = '⬅️ Назад до вибору категорії';
            break;
        case 'be':
            textChooseCategory = 'Выберыце падкатэгорыю';
            textBackToCategorySelection = '⬅️ Вярнуцца да выбару катэгорыі';
            break;
        case 'eng':
            textChooseCategory = 'Select a subcategory';
            textBackToCategorySelection = '⬅️ Back to select a category';
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

async function sendSpecialTags(chatId, messageId, selMsg){
    let apiUrl = `${urlAPI}/api/tag/all`;
    let textBackToSubCategorySelection = '';
    let textSkipChooseTag = '';
    let textChooseSubCategory = '';
    switch (selMsg) {
        case 'ru':
            textBackToSubCategorySelection = '⬅️ Назад к выбору подкатегории';
            textChooseSubCategory = 'Выберите тэг';
            textSkipChooseTag = 'Пропустить';
            break;
        case 'pl':
            textBackToSubCategorySelection = '⬅️ Powrót do wyboru podkategorii';
            textChooseSubCategory = 'Wybierz tag';
            textSkipChooseTag = 'Pomiń';
            break;
        case 'uk':
            textBackToSubCategorySelection = '⬅️ Назад до вибору підкатегорії';
            textChooseSubCategory = 'Виберіть тег';
            textSkipChooseTag = 'Пропустити';
            break;
        case 'be':
            textBackToSubCategorySelection = '️ ️⬅️ Вярнуцца да выбару падкарэгорыі';
            textChooseSubCategory = 'Выберыце тэг';
            textSkipChooseTag = 'Прапусціць';
            break;
        case 'eng':
            textBackToSubCategorySelection = '⬅️ Back to subcategory selection';
            textChooseSubCategory = 'Select a tag';
            textSkipChooseTag = 'Skip';
            break;
        default:
            break;
    }
    try {
        const response = await axios.get(apiUrl);
        const tags = response.data;
        const filteredTags = tags
            .filter(tag => !['polski', 'russian', 'english', 'belarusian', 'ukrainian', 'another', 'petfriendly', 'Przyjazne dla dzieci'].includes(tag.name))
            .map(tag => tag.name);
        console.log(filteredTags);
        const apiTranslate = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=pl&tl=${selMsg}&q=${filteredTags}`;
        const translate = await axios.get(apiTranslate);
        const trans = translate.data;
        const translatedTags = trans[0][0][0].split(',');
        console.log(translatedTags)
        const chunkedTags = chunkArray(filteredTags, 3);
        const inlineKeyboard = chunkedTags.map((column, columnIndex) => {
            return column.map((tag, index) => ({
                text: translatedTags[columnIndex * 3 + index],
                callback_data: `tag_${tag.trim()}`,
            }));
        });
        inlineKeyboard.push([{ text: textSkipChooseTag, callback_data: `tag_none` }]);
        inlineKeyboard.push([{ text: textBackToSubCategorySelection, callback_data: `back_to_subcategory_selection` }]);

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };

        await bot.editMessageText(textChooseSubCategory, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: options.reply_markup,
        });
    } catch (e) {
        console.error(e);
    }
}

async function search(chatId, messageId, subcategory, region, selMsg, tags) {
    let apiUrl = `${urlAPI}/api/company/search?categoryName=${encodeURIComponent(subcategory)}&city=${encodeURIComponent(region)}&page=1&perPage=20`;
    if (tags) {
        apiUrl += `&tags=${encodeURIComponent(tags)}`;
    }
    console.log(apiUrl);
    let textOtherCompanies, textChooseCompany, textNotFound, textBackCategory;

    switch (selMsg) {
        case 'ru':
            textOtherCompanies = 'Остальные компании';
            textChooseCompany = 'Выберите компанию';
            textNotFound = 'По вашему запросу ничего не найдено';
            textBackCategory = '⬅️ Назад к выбору тэга';
            break;
        case 'pl':
            textOtherCompanies = 'Inne firmy';
            textChooseCompany = 'Wybierz firmę';
            textNotFound = 'Nic nie znaleziono dla Twojego zapytania';
            textBackCategory = '⬅️ Powrót do wyboru tagu';
            break;
        case 'uk':
            textOtherCompanies = 'Інші компанії';
            textChooseCompany = 'Виберіть компанію';
            textNotFound = 'За вашим запитом нічого не знайдено';
            textBackCategory = '⬅️ Назад до вибору тега';
            break;
        case 'be':
            textOtherCompanies = 'Іншыя кампаніі';
            textChooseCompany = 'Выберыце кампанію';
            textNotFound = 'На вашым запыце нічога не атрымалася знайсці';
            textBackCategory = '⬅️ Вярнуцца да выбару тэгаў';
            break;
        case 'eng':
            textOtherCompanies = 'Other companies';
            textChooseCompany = 'Select a company';
            textNotFound = 'Nothing was found for your request';
            textBackCategory = '⬅️ Back to tag selection';
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
                    inline_keyboard: [[{ text: textBackCategory , callback_data: `back_to_tags_selection` }]],
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
            inlineKeyboard.push([{ text: textOtherCompanies, url: `https://beaty-box.vercel.app/${subcategory}` }]);
        }
        inlineKeyboard.push([{ text: textBackCategory, callback_data: `back_to_tags_selection` }]);

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

async function getCompanyByName(chatId, messageId, companyName, selMsg) {
    let apiUrl = `${urlAPI}/api/company/name/${companyName}`;
    let textGoToSiteCompany = '';
    let textBackToChooseCompany = '';

    switch (selMsg) {
        case 'ru':
            textGoToSiteCompany = 'Перейти на сайт компании';
            textBackToChooseCompany = '⬅️ Назад к выбору компании';
            break;
        case 'pl':
            textGoToSiteCompany = 'Przejdź na stronę internetową firmy';
            textBackToChooseCompany = '⬅️ Powrót do wyboru firmy';
            break;
        case 'uk':
            textGoToSiteCompany = 'Перейти на сайт компанії';
            textBackToChooseCompany = '⬅️ Назад до вибору компанії';
            break;
        case 'be':
            textGoToSiteCompany = 'Перайсці на старонку кампаніі';
            textBackToChooseCompany = '⬅️ Вярнуцца да выбару кампаніі';
            break;
        case 'eng':
            textGoToSiteCompany = 'Go to the company\'s website';
            textBackToChooseCompany = '⬅️ Back to company selection';
            break;
        default:
            break;
    }

    try {
        const response = await axios.get(apiUrl);
        const companyData = response.data;
        let insta = '';

        let messageText = `*${companyData.name}*\n\n`;
        if(companyData.description){
            messageText += `📝 ${companyData.description}\n`;
        }
        messageText += `📍 ${companyData.address}\n\n`;

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

            const companyLinkButton = { text: textGoToSiteCompany, url: `https://beaty-box.vercel.app/${encodeURIComponent(subcategory)}/${encodeURIComponent(companyData.name)}` };
            const backButton = { text: textBackToChooseCompany, callback_data: 'back_to_company_selection' };

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
