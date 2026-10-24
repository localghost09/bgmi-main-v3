/* Operator-supplied BGIS 2026 Match 13/14 reference snapshot.
   Showcase/reference preview only. This file is never written to the database
   and reference=1 deliberately ignores live scoring responses. */
(function () {
  'use strict';
  var assets = '/assets/images/bgis-2026/';
  var rows = [
    ['OG', 10, 16], ['NINZ', 2, 15], ['SOUL', 6, 9], ['K9', 3, 9],
    ['NBE', 5, 6], ['RNTX', 4, 7], ['GODL', 0, 9], ['MYTH', 0, 7],
    ['GENS', 0, 6], ['VE', 1, 4], ['WF', 0, 4], ['LEFP', 1, 2],
    ['RGE', 0, 3], ['WELT', 0, 1], ['TT', 0, 1], ['VS', 0, 1]
  ];
  var winnerPlayers = [
    { name: 'IQOOXOGAKOP', kills: 7, damage: 803, survival: '27:26', knocks: 3, avatarUrl: assets + 'players/akop.png' },
    { name: 'IQOOXOGWIZGOD', kills: 5, damage: 752, survival: '27:22', knocks: 5, avatarUrl: assets + 'players/wizgod.png' },
    { name: 'IQOOXOGATTANKI', kills: 3, damage: 503, avatarUrl: assets + 'players/attanki.png' },
    { name: 'IQOOXOGAARU', kills: 1, damage: 270, avatarUrl: assets + 'players/aaru.png' }
  ];
  var teams = rows.map(function (row, index) {
    var tag = row[0];
    var key = tag.toLowerCase();
    return {
      id: index + 1,
      name: tag === 'OG' ? 'IQOO ORANGUTAN' : tag,
      shortName: tag,
      tag: tag,
      broadcastTag: tag,
      group: 'A',
      logo: assets + 'teams/row-' + key + '.png',
      mapLogo: assets + 'teams/map-' + key + '.png',
      wins: tag === 'OG' ? 1 : 0,
      matches: 13,
      fin: row[2],
      place: row[1],
      total: row[1] + row[2],
      matchKills: row[2],
      matchPlace: index + 1,
      matchPlacePts: row[1],
      matchTotal: row[1] + row[2],
      alive: 4,
      players: tag === 'OG' ? winnerPlayers : []
    };
  });
  function award(player, team, tag, kills, damage, survival, knocks, photo) {
    return {
      player: player,
      teamName: team,
      teamTag: tag,
      logo: assets + 'teams/row-' + tag.toLowerCase() + '.png',
      kills: kills,
      damage: damage,
      survival: survival,
      knocks: knocks,
      avatarUrl: assets + 'players/' + photo
    };
  }
  var mvp = award('NINZAJAVIN', 'NINZ', 'NINZ', 8, 1554, '26:06', 11, 'ninzajavin.png');
  mvp.cutoutUrl = assets + 'players/ninz-cutout.png';
  mvp.logo = assets + 'teams/ninz-large.png';
  window.BGIS_MATCH_REFERENCE = {
    demo: true,
    reference: true,
    event: 'BGIS 2026',
    organizer: 'KRAFTON INDIA ESPORTS',
    stage: 'GRAND FINALS',
    group: 'A',
    match: 13,
    mapFeedMatch: 14,
    map: 'Erangel',
    matchesTotal: 16,
    squads: 16,
    prize: 'GRAND FINALS',
    teams: teams,
    mapOrder: ['VE', 'LEFP', 'MYTH', 'NBE', 'WELT', 'WF', 'OG', 'SOUL',
      'GODL', 'K9', 'RNTX', 'TT', 'NINZ', 'VS', 'RGE', 'GENS'],
    winner: {
      name: 'IQOO ORANGUTAN', tag: 'OG', shortName: 'OG',
      logo: assets + 'teams/row-og.png',
      mapLogo: assets + 'teams/map-og.png',
      lineupUrl: assets + 'teams/og-lineup.png',
      kills: 16, place: 1, total: 26, wwcd: 1,
      damage: 2328, heals: 1172, knocks: 12, headshots: 1,
      players: winnerPlayers
    },
    playerAwards: {
      matchMvp: mvp,
      matchTopPlayers: [
        mvp,
        award('IQOOXOGAKOP', 'IQOO ORANGUTAN', 'OG', 7, 803, '27:26', 3, 'akop-top.png'),
        award('MYTHDETROX', 'MYTH', 'MYTH', 6, 1084, '17:58', 6, 'mythdetrox.png'),
        award('IQOOXOGWIZGOD', 'IQOO ORANGUTAN', 'OG', 5, 752, '27:22', 5, 'wizgod-top.png'),
        award('GODLSPOWERR1', 'GODL', 'GODL', 4, 608, '19:06', 4, 'godlpower.png')
      ]
    },
    killFeed: [
      { killer: 'NINZAJAVIN', team: 'VS', victim: 'VS PLAYER', weapon: 'M416' },
      { killer: 'IQOOXOGAKOP', team: 'GENS', victim: 'GENS PLAYER', weapon: 'AKM' }
    ]
  };
})();
