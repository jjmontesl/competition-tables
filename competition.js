/*
 */

'use strict';

var dataset = null;

var IDX_COMP = 0;
var IDX_CATEGORY = 1;
var IDX_PHASE = 2;
var IDX_GROUP = 4;
var IDX_TEAM_L = 7;
var IDX_TEAM_V = 8;
var IDX_RESULT = 11;


function competitionFilterData(data, comp, category, phase, group) {
	var rows = [];
	data.forEach(function(row, idx) {
		if ((!comp || row[IDX_COMP] == comp) &&
			(!category || row[IDX_CATEGORY] == category) &&
			(!phase || row[IDX_PHASE] == phase) &&
			(!group || row[IDX_GROUP] == group)) {
			rows.push(row);
		}
	});
	console.debug(rows);
	return rows;
};

function competitionMatchRow(data, teamL, teamV, comp, category, phase, group) {
	var rows = [];
	data.forEach(function(row, idx) {
		if ((!teamL || row[IDX_TEAM_L] == teamL) &&
			(!teamV || row[IDX_TEAM_V] == teamV) &&
			(!comp || row[IDX_COMP] == comp) &&
			(!category || row[IDX_CATEGORY] == category) &&
			(!phase || row[IDX_PHASE] == phase) &&
			(!group || row[IDX_GROUP] == group)) {
			rows.push(row);
		}
	});
	return rows[0];
};

function competitionResultTennis(row, teamL, teamV) {

	var result = row[IDX_RESULT];

	if (result) {
		teamL.matches_played += 1;
		teamV.matches_played += 1;

		var sets = result.split("/");
		var localSetsWon = 0;
		var visitorSetsWon = 0;
		var localTotalGamesWon = 0;
		var visitorTotalGamesWon = 0;
		sets.forEach(function(set, idx) {
			set = set.trim();
			var scores = set.split("-");
			var localGamesWon = parseInt(scores[0].trim());
			var visitorGamesWon = parseInt(scores[1].trim());
			localSetsWon += (localGamesWon > visitorGamesWon ? 1 : 0);
			visitorSetsWon += (localGamesWon < visitorGamesWon ? 1 : 0);

			if ((localGamesWon == 7 && visitorGamesWon == 6) || (localGamesWon == 6 && visitorGamesWon == 7)) {
				// Tie breaks
				teamL.tiebreaks_played += 1;
				teamV.tiebreaks_played += 1;
				teamL.tiebreaks_won += (localGamesWon > visitorGamesWon ? 1 : 0);
				teamV.tiebreaks_won += (localGamesWon < visitorGamesWon ? 1 : 0);
				teamL.tiebreaks_lost += (localGamesWon < visitorGamesWon ? 1 : 0);
				teamV.tiebreaks_lost += (localGamesWon > visitorGamesWon ? 1 : 0);
			}
			if (localGamesWon > 7 || visitorGamesWon > 7) {
				// Super Tie Break
				localGamesWon = (localGamesWon > visitorGamesWon ? 1 : 0);
				visitorGamesWon = (localGamesWon < visitorGamesWon ? 1 : 0);
			}

			localTotalGamesWon += localGamesWon;
			visitorTotalGamesWon += visitorGamesWon;
		});

		teamL.matches_won += (localSetsWon > visitorSetsWon ? 1 : 0);
		teamV.matches_won += (localSetsWon < visitorSetsWon ? 1 : 0);
		teamL.matches_lost += (localSetsWon < visitorSetsWon ? 1 : 0);
		teamV.matches_lost += (localSetsWon > visitorSetsWon ? 1 : 0);

		teamL.sets_played += (localSetsWon + visitorSetsWon);
		teamV.sets_played += (localSetsWon + visitorSetsWon);
		teamL.sets_won += localSetsWon;
		teamV.sets_won += visitorSetsWon;
		teamL.sets_lost += visitorSetsWon;
		teamV.sets_lost += localSetsWon;

		teamL.games_played += (localTotalGamesWon + visitorTotalGamesWon);
		teamV.games_played += (localTotalGamesWon + visitorTotalGamesWon);
		teamL.games_won += localTotalGamesWon;
		teamV.games_won += visitorTotalGamesWon;
		teamL.games_lost += visitorTotalGamesWon;
		teamV.games_lost += localTotalGamesWon;
	}
};

function competitionStats(teamName) {
	return {
		name: teamName,
		group: null,
		matches_played: 0,
		matches_won: 0,
		matches_lost: 0,
		sets_played: 0,
		sets_won: 0,
		sets_lost: 0,
		games_played: 0,
		games_won: 0,
		games_lost: 0,
		tiebreaks_played: 0,
		tiebreaks_won: 0,
		tiebreaks_lost: 0,
		abandoned: 0
	};
}

Vue.component('competition-matrix', {
	props: ['comp', 'category', 'phase', 'group'],
	data: function () {

		var rows = competitionFilterData(dataset, this.comp, this.category, this.phase, this.group);

		var teams = [];
		rows.forEach(function(row, idx) {
			if (teams.indexOf(row[IDX_TEAM_L]) <0) teams.push(row[IDX_TEAM_L]);
			if (teams.indexOf(row[IDX_TEAM_V]) <0) teams.push(row[IDX_TEAM_V]);
		});
		teams.reverse();

		var results = {};
		teams.forEach(function(teamLocal, idxL) {
			results[teamLocal] = {};
			teams.forEach(function(teamVisitor, idxV) {
				var matchRow = competitionMatchRow(rows, teamLocal, teamVisitor);
				if (matchRow) {
					var result = matchRow[IDX_RESULT];
					results[teamLocal][teamVisitor] = tennisResultFilter(result);
				}
			});
		});

		return {
			teams: teams,
			results: results
		}
	},
	template: '<div>' +
			  '  <h2>{{ category }} - Fase {{ phase }} - Grupo {{ group }}</h2>' +
			  '  <div class="table-responsive"><table class="comp table table-bordered">' +
			  '    <tr>' +
			  '      <th></th>' +
			  '      <th v-for="teamVisitor in teams"><small>{{ teamVisitor }}</small></th>' +
			  '    </tr>' +
			  '    <tr v-for="(teamLocal, idxL) in teams">' +
			  '       <th><small>{{ teamLocal }}</small></th>' +
			  '       <td v-for="(teamVisitor, idxV) in teams" v-bind:class="{\'table-secondary\': idxV >= idxL}" class="text-center align-middle"><span v-html="results[teamLocal][teamVisitor]"></span></td>' +
			  '    </tr>' +
			  '  </table></div>' +
			  '</div>',

});


Vue.component('competition-matrix-groups', {
	props: ['comp', 'category', 'phase'],
	data: function () {

		var rows = competitionFilterData(dataset, this.comp, this.category, this.phase, null);

		var groups = [];
		rows.forEach(function(row, idx) {
			if (groups.indexOf(row[IDX_GROUP]) <0) groups.push(row[IDX_GROUP]);
		});

		return {
			groups: groups,
		}
	},
	template: '<div>' +
			  '  <div><b>{{ }}</b></div>' +
			  '  <div v-for="group in groups">' +
			  '		<competition-matrix v-bind:comp="comp" v-bind:category="category" v-bind:phase="phase" v-bind:group="group"></competition-matrix>' +
			  '  </div>' +
			  '</div></div>',
});


Vue.component('competition-classif', {
	props: ['comp', 'category', 'phase', 'group'],
	data: function () {

		var rows = competitionFilterData(dataset, this.comp, this.category, this.phase, this.group);

		var teams = {};
		rows.forEach(function(row, idx) {

			[row[IDX_TEAM_L], row[IDX_TEAM_V]].forEach(function(team, teamIdx) {
				if (! (team in teams)) {
					teams[team] = competitionStats(team);
					teams[team].group = row[IDX_GROUP];
				}
			});

			competitionResultTennis(row, teams[row[IDX_TEAM_L]], teams[row[IDX_TEAM_V]]);
		});

		teams = Object.values(teams);
		teams.sort(function(a, b) {
			var matchesDiff = b.matches_won - a.matches_won;
			if (matchesDiff != 0) return matchesDiff;

			var setsRatioDiff = ((b.sets_won / b.sets_played) || 0) - ((a.sets_won / a.sets_played) || 0);
			if (setsRatioDiff != 0) return setsRatioDiff;

			var gamesRatioDiff = ((b.games_won / b.games_played) || 0) - ((a.games_won / a.games_played) || 0);
			if (gamesRatioDiff != 0) return gamesRatioDiff;

			return b.matches_played - a.matches_played;
		});

		return {
			teams: teams,
		}
	},
	template: '<div>' +
			  '  <div><b>{{ category }} - Fase {{ phase }}</b></div>' +
			  '    <div class="table-responsive"><table class="comp table table-bordered table-hover tablesaw tablesaw-stack" data-tablesaw-mode="stack" data-tablesaw-sortable data-tablesaw-sortable-switch>' +
			  '      <thead><tr>' +
			  '        <th>Equipo</th>' +
			  '        <th class="text-right" scope="col" data-tablesaw-sortable-col><acronym title="Partidos Jugados">PJ</acronym></th>' +
			  '        <th class="text-right"><acronym title="Partidos Ganados">PG</acronym></th>' +
			  '        <th class="text-right"><acronym title="Partidos Perdidos">PP</acronym></th>' +
			  '        <th class="text-right"><acronym title="Sets Jugados">SJ</acronym></th>' +
			  '        <th class="text-right"><acronym title="Sets Ganados">SG</acronym></th>' +
			  '        <th class="text-right"><acronym title="Sets Perdidos">SP</acronym></th>' +
			  '        <th class="text-right"><acronym title="Juegos Jugados">JJ</acronym></th>' +
			  '        <th class="text-right"><acronym title="Juegos Ganados">JG</acronym></th>' +
			  '        <th class="text-right"><acronym title="Juegos Perdidos">JP</acronym></th>' +
			  '        <th class="text-right"><acronym title="% Sets Ganados">SG%</acronym></th>' +
			  '        <th class="text-right"><acronym title="% Juegos Ganados">JG%</acronym></th>' +
			  '      </tr></thead>' +
			  '      <tr v-for="team in teams">' +
			  '        <td>{{ team.name }} <small v-if="team.group" class="text-muted text-small" title="Grupo">({{ team.group }})</small></td>' +
			  '        <td class="text-right">{{ team.matches_played }}</td>' +
			  '        <td class="text-right font-weight-bold text-success">{{ team.matches_won }}</td>' +
			  '        <td class="text-right font-weight-bold text-danger">{{ team.matches_lost }}</td>' +
			  '        <td class="text-right">{{ team.sets_played }}</td>' +
			  '        <td class="text-right text-success">{{ team.sets_won }}</td>' +
			  '        <td class="text-right text-danger">{{ team.sets_lost }}</td>' +
			  '        <td class="text-right">{{ team.games_played }}</td>' +
			  '        <td class="text-right text-success">{{ team.games_won }}</td>' +
			  '        <td class="text-right text-danger">{{ team.games_lost }}</td>' +
			  ' 	   <td class="text-right font-italic">{{ (team.sets_won / team.sets_played) | percentage }}</td>' +
			  '        <td class="text-right font-italic">{{ (team.games_won / team.games_played) | percentage }}</td>' +
			  '      </tr>' +
			  '   </table></div>' +
			  '</div>',
});


Vue.component('competition-ranking', {
	props: [], // ['comp', 'category'],
	data: function () {

		var rows = competitionFilterData(dataset, this.comp, this.category, null);

		var teams = {};
		rows.forEach(function(row, idx) {

			[row[IDX_TEAM_L], row[IDX_TEAM_V]].forEach(function(team, teamIdx) {
				if (! (team in teams)) {
					if (! (team in teams)) {
						teams[team] = competitionStats(team);
					}
				}
			});

			competitionResultTennis(row, teams[row[IDX_TEAM_L]], teams[row[IDX_TEAM_V]]);

		});

		teams = Object.values(teams);
		teams.sort(function(a, b) {
			var matchesDiff = b.matches_won - a.matches_won;
			if (matchesDiff != 0) return matchesDiff;

			var setsRatioDiff = ((b.sets_won / b.sets_played) || 0) - ((a.sets_won / a.sets_played) || 0);
			if (setsRatioDiff != 0) return setsRatioDiff;

			var gamesRatioDiff = ((b.games_won / b.games_played) || 0) - ((a.games_won / a.games_played) || 0);
			if (gamesRatioDiff != 0) return gamesRatioDiff;

			return b.matches_played - a.matches_played;
		});

		return {
			teams: teams,
		}
	},
	template: '<div>' +
			  '    <div class="table-responsive"><table class="comp table table-bordered table-hover tablesaw tablesaw-stack" data-tablesaw-mode="stack" data-tablesaw-sortable data-tablesaw-sortable-switch>' +
			  '      <thead><tr>' +
			  '        <th>Equipo</th>' +
			  '        <th class="text-right" scope="col" data-tablesaw-sortable-col><acronym title="Partidos Jugados">PJ</acronym></th>' +
			  '        <th class="text-right"><acronym title="Partidos Ganados">PG</acronym></th>' +
			  '        <th class="text-right"><acronym title="Partidos Perdidos">PP</acronym></th>' +
			  '        <th class="text-right"><acronym title="Sets Jugados">SJ</acronym></th>' +
			  '        <th class="text-right"><acronym title="Sets Ganados">SG</acronym></th>' +
			  '        <th class="text-right"><acronym title="Sets Perdidos">SP</acronym></th>' +
			  '        <th class="text-right"><acronym title="Juegos Jugados">JJ</acronym></th>' +
			  '        <th class="text-right"><acronym title="Juegos Ganados">JG</acronym></th>' +
			  '        <th class="text-right"><acronym title="Juegos Perdidos">JP</acronym></th>' +
			  '        <th class="text-right"><acronym title="% Sets Ganados">SG%</acronym></th>' +
			  '        <th class="text-right"><acronym title="% Juegos Ganados">JG%</acronym></th>' +
			  '      </tr></thead>' +
			  '      <tr v-for="team in teams" v-if="team.matches_played > 0">' +
			  '        <td>{{ team.name }} <small class="text-muted text-small" v-if="team.group" title="Grupo">({{ team.group }})</small></td>' +
			  '        <td class="text-right">{{ team.matches_played }}</td>' +
			  '        <td class="text-right font-weight-bold text-success">{{ team.matches_won }}</td>' +
			  '        <td class="text-right font-weight-bold text-danger">{{ team.matches_lost }}</td>' +
			  '        <td class="text-right">{{ team.sets_played }}</td>' +
			  '        <td class="text-right text-success">{{ team.sets_won }}</td>' +
			  '        <td class="text-right text-danger">{{ team.sets_lost }}</td>' +
			  '        <td class="text-right">{{ team.games_played }}</td>' +
			  '        <td class="text-right text-success">{{ team.games_won }}</td>' +
			  '        <td class="text-right text-danger">{{ team.games_lost }}</td>' +
			  ' 	   <td class="text-right font-italic">{{ (team.sets_won / team.sets_played) | percentage }}</td>' +
			  '        <td class="text-right font-italic">{{ (team.games_won / team.games_played) | percentage }}</td>' +
			  '      </tr>' +
			  '   </table></div>' +
			  '</div>',
});


function tennisResultFilter(value) {
	if (!value) return '';

	var setStrings = [];
	var sets = value.split("/");
	sets.forEach(function(set, idx) {
		set = set.trim();
		var scores = set.split("-");
		var localGamesWon = parseInt(scores[0].trim());
		var visitorGamesWon = parseInt(scores[1].trim());
		var setString = (localGamesWon > visitorGamesWon ? ('<b>' + localGamesWon + '</b>') : (localGamesWon)) + "-" +
						(localGamesWon < visitorGamesWon ? ('<b>' + visitorGamesWon + '</b>') : (visitorGamesWon));
		setStrings.push(setString);
	});
	return setStrings.join(' <span class="text-warning">/</span> ');
}

Vue.filter('tennisresult', tennisResultFilter);

Vue.filter('percentage', function(value, decimals) {
  if(!value) {
    value = 0;
  }

  if(!decimals) {
    decimals = 0;
  }

  value = value * 100;
  value = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  value = value + '%';
  return value;
});


function initCompetitionTables(dataUrl) {
	console.debug("Initializing competition tables.")

	CSV.fetch({url: dataUrl}).then(function(csvdata) {

		//console.debug(csvdata);
		dataset = csvdata.records;

		var vm = new Vue({
			el: '#competition-app',
			data: {
				dataset: csvdata.records
			}
		});

	});
};

