const bun = require('bun');
const cheerio = require('cheerio');
const fs = require('fs');
const readline = require('readline');
const { DateTime } = require('luxon');

class Service1 {
    constructor() {
        this.URL = "https://www.cubdomain.com/domains-registered-by-date/";
        this.Agent = "GoogleBot v3";
    }

    async countPages(date) {
        const response = await bun.fetch(`${this.URL}${date}/1`, { headers: { 'User-Agent': this.Agent } });
        const body = await response.text();
        const $ = cheerio.load(body);
        
        let lastPage = 0;
        $('a.page-link').each((_, element) => {
            const pageText = $(element).text();
            const page = parseInt(pageText);
            if (!isNaN(page) && page > lastPage) {
                lastPage = page;
            }
        });

        return lastPage;
    }

    async dump(date, page, exts = []) {
        const response = await bun.fetch(`${this.URL}${date}/${page}`, { headers: { 'User-Agent': this.Agent } });
        const body = await response.text();
        const $ = cheerio.load(body);
        
        let data = [];

        $('div.col-md-4').each((_, element) => {
            const siteText = $(element).text().replace(/\n/g, '');
            if (exts.length === 0) {
                data.push(siteText);
            } else {
                for (const ext of exts) {
                    const regex = new RegExp(`(${ext})$`);
                    if (regex.test(siteText)) {
                        data.push(siteText);
                        break;
                    }
                }
            }
        });

        return data;
    }
}

function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
    }));
}

async function saveDataToFile(filename, data) {
    const content = data.join('\n');
    fs.writeFileSync(filename, content, 'utf8');
}

(async () => {
    console.log("There are 2 servers we provided, which every server providing their own data.");
    console.log("Server 1, serve domains by date registration.");
    console.log("Server 2, serve domains by their extensions. So, choose it first.");
    const serviceChoice = await prompt("⚙ Then your choice is: ");

    if (serviceChoice === "1") {
        console.log("⚙ Start using server 1");
        console.log("⚙ info");
        console.log(`"""
    This Server is serve domains by dates, you must input valid date formats which are correct by this bot.
    Valid Formats:
      @ 2023-08-01

"""`);
        const fromDate = await prompt("⚙ From date (YYYY-MM-DD / TAHUN-BULAN-HARI): ");
        const toDate = await prompt("⚙ To date (YYYY-MM-DD / TAHUN-BULAN-HARI): ");

        const service1 = new Service1();

        let currentDate = DateTime.fromISO(fromDate);
        const endDate = DateTime.fromISO(toDate);
        let allData = [];

        while (currentDate <= endDate) {
            const validDate = currentDate.toISODate();
            const totalPages = await service1.countPages(validDate);

            console.log(`⚙ Date: ${validDate} | Total pages: ${totalPages}`);

            for (let page = 1; page <= totalPages; page++) {
                const data = await service1.dump(validDate, page.toString(), []); // You can specify extensions here
                allData = allData.concat(data);
            }

            currentDate = currentDate.plus({ days: 1 });
        }

        console.log("⚙ Dumping all data to grablist.txt..");
        try {
            await saveDataToFile('grablist.txt', allData);
            console.log("⚙ Data saved to grablist.txt");
        } catch (err) {
            console.log("⚙ Error saving data:", err);
        }

    } else if (serviceChoice === "2") {
        // Implement Server 2 logic here
    } else {
        console.log("Invalid service choice.");
    }

    console.log("Done... Click Enter to exit!");
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
})();
