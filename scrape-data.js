const puppeteer = require("puppeteer");
const axios = require("axios");

const url =
  "https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/qatar2022/scores-fixtures?country=UG&wtw-filter=ALL";

const apiUrl = "https://fifa-world-cup.nibble.repl.co/api/v1/matches";

let browser;

const scrapeWorldCupFixtures = async (apiUrl) => {
  try {
    browser = await puppeteer.launch({
      defaultViewport: { width: 1522, height: 9332 },
    });
    const newPage = await browser.newPage();
    await newPage.goto(url, { waitUntil: "networkidle0", timeout: 0 });

    const worldCupData = await newPage.evaluate(async () => {
      const matchDates = [];

      const container = document.querySelectorAll(
        ".where-to-watch-section_containerCentered__2LjSu > div"
      )[1];

      const containers = container.querySelectorAll(".ff-p-0 > div");
      const rejectCookieButton = document.querySelector(
        "#onetrust-reject-all-handler"
      );
      if (rejectCookieButton) {
        rejectCookieButton.click();
      }

      const pause = (timeout) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, timeout);
        });
      };

      await pause(1000);

      if (!containers) {
        return matchDates;
      }

      containers.forEach((container) => {
        const days = {};
        const matchDayElement = container.querySelector(
          ".matches-container_title__1uTPf"
        );

        if (matchDayElement) {
          days.matchDay = matchDayElement.textContent;
        }
        const matchWrapperElements = container.querySelector(
          ".matches-container_header__1AZ2M + div.row"
        );

        if (!matchWrapperElements) {
          return matchDates;
        }

        const innerMatchWrapperElements = matchWrapperElements.querySelectorAll(
          ".col-lg-12.col-md-6.col-sm-12"
        );

        if (!innerMatchWrapperElements) {
          return matchDates;
        }

        const matches = [];

        innerMatchWrapperElements.forEach((innermostMatchWrapperElements) => {
          const match = {};
          const teams = innermostMatchWrapperElements.querySelectorAll(
            "span.match-component_wtwTeamName__3fKAq"
          );

          if (teams && teams.length > 1) {
            match.homeTeam = teams[0].textContent;
            match.awayTeam = teams[1].textContent;
          }

          const score = innermostMatchWrapperElements.querySelector(
            ".show-match-score_score__23vdC"
          );
          match.score = score
            ? score.textContent.replaceAll(/[^\·0-9]/g, "")
            : "";

          const stadium = innermostMatchWrapperElements.querySelector(
            ".match-component_wtwStadium__18eYr"
          );
          match.stadium = stadium ? stadium.ariaLabel : "";

          const group =
            innermostMatchWrapperElements.querySelector(".ff-m-0.ff-p-0");

          match.group = group ? group.textContent : "";

          const matchStatusIndicator =
            innermostMatchWrapperElements.querySelector(
              ".wtw-match-status_indicator__3cO5Z"
            );
          match.status = matchStatusIndicator
            ? matchStatusIndicator.textContent
            : "";

          const matchSourceWrapper =
            innermostMatchWrapperElements.querySelectorAll(
              ".source-match-block_iconWrapper__3yBY2"
            );
          const tvStations = [];
          if (matchSourceWrapper && matchSourceWrapper.length > 0) {
            matchSourceWrapper.forEach((wrapper) => {
              const image = wrapper.querySelector("img");
              if (image) {
                const { pathname } = new URL(image.src);
                if (pathname.endsWith("255.png")) {
                  tvStations.push("SuperSport");
                }

                if (pathname.endsWith("289.png")) {
                  tvStations.push("UBC");
                }
              }
            });
          }

          match.tvStations = tvStations;

          matches.push(match);
        });

        days.matches = matches;
        matchDates.push(days);
      });

      return matchDates;
    });

    if (!worldCupData.length) return;

    const response = await axios.post(apiUrl, worldCupData);
    console.log(response.data);
  } catch (error) {
    console.error(error);
  } finally {
    if (browser) await browser.close();
  }
};

scrapeWorldCupFixtures(apiUrl);
