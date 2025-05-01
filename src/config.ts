import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://alpsec.at", // replace this with your deployed domain
  author: "54toshi",
  profile: "https://54toshi.com",
  desc: "Verein zur Förderung von offensiver und defensiver Cybersicherheit",
  title: "AlpSec",
  ogImage: "assets/logo.png",
  lightAndDarkMode: false,
  search: false,
  postPerIndex: 4,
  postPerPage: 3,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: false,
  editPost: {
    url: "https://github.com/AlpSecAustria/website/edit/main/src/content/blog",
    text: "Änderungen vorschlagen",
    appendFilePath: true,
  },
};

export const LOCALE = {
  lang: "de", // html lang code. Set this empty and default will be "en"
  langTag: ["de-DE"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: false,
  width: 80,
  height: 80,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Web",
    href: "https://discord.gg/FfvPj3Tcd2",
    linkTitle: `${SITE.title} on the Web`,
    active: false,
  },
  {
    name: "Discord",
    href: "https://discord.gg/FfvPj3Tcd2",
    linkTitle: `${SITE.title} on Discord`,
    active: true,
  },
  {
    name: "Github",
    href: "https://github.com/AlpSecAustria/",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
  {
    name: "Facebook",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Facebook`,
    active: false,
  },
  {
    name: "Instagram",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Instagram`,
    active: false,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/alpsec",
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true,
  },
  {
    name: "Mail",
    href: "mailto:contact@alp-sec.org",
    linkTitle: `Send an email to ${SITE.title}`,
    active: true,
  },
  {
    name: "X",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on X`,
    active: false,
  },
  {
    name: "Twitch",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Twitch`,
    active: false,
  },
  {
    name: "YouTube",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on YouTube`,
    active: false,
  },
  {
    name: "WhatsApp",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on WhatsApp`,
    active: false,
  },
  {
    name: "Snapchat",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Snapchat`,
    active: false,
  },
  {
    name: "Pinterest",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Pinterest`,
    active: false,
  },
  {
    name: "TikTok",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on TikTok`,
    active: false,
  },
  {
    name: "CodePen",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on CodePen`,
    active: false,
  },
  {
    name: "GitLab",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on GitLab`,
    active: false,
  },
  {
    name: "Reddit",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Reddit`,
    active: false,
  },
  {
    name: "Skype",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Skype`,
    active: false,
  },
  {
    name: "Steam",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Steam`,
    active: false,
  },
  {
    name: "Telegram",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Telegram`,
    active: false,
  },
  {
    name: "Mastodon",
    href: "https://github.com/satnaing/astro-paper",
    linkTitle: `${SITE.title} on Mastodon`,
    active: false,
  },
];
