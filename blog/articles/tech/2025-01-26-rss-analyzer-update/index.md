---
slug: sunday-projects-rss-analyzer-update-1
title: 'Sunday-Projects – RSS Analyzer Update 1'
date: 2025-01-26T12:00
authors: [ luca ]
tags: [ artikel, tech, sunday-projects, luca ]
draft: false
image: /img/tech/sundayprojects/rssanalyzer.jpg
---

'Sunday Projects' sind die kleinen, technischen Projekte und Spielereien mit denen ich in unregelmäßigen Abständen meine
Zeit verbringe.

Diesmal mit einem Update des [RSS Analyzer](/sunday-projects-rss-analyzer).

Die Auswertungen sind hier zu finden: [https://rssanalyzer.org](https://rssanalyzer.org/mindestens10zeichen).

![intro image](/img/tech/sundayprojects/rssanalyzer.jpg)

<!--truncate-->

```java
public static void main(String[] args) throws IOException {
        final StopWatch stopWatch = StopWatch.createStarted();
        logger.info("Starting rss-analyzer");

        final Config config = yamlMapper.readValue(new File("src/main/resources/config.yaml"), Config.class);
        final CacheHandler cacheHandler = new FileSystemCache(config);

        try {
            // Iterate over RSS Feeds and compute serializable result record
            final Result result = computeResult(config, new StaticCategoryMatcher(config));

            // Register Export Transformer
            new RssExporter(config).export(
                    result,
                    new JsonTransformer(),
                    new CSVTransformer(),
                    new YamlTransformer()
            );
        } finally {
            cacheHandler.commit();
            stopWatch.stop();
            logger.info("Stopping rss-analyzer");
            logger.info("Elapsed time: " + stopWatch.getDuration().toMillis() + "ms");
        }
    }
```
