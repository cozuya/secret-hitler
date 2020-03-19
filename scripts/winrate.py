#Made by Dominick, Mike Dukakis on Discord, @MayorPete on SecretHitler.io, domdellumich on GitHub.
#Purpose: Calculate Win Rates of all fascist lines and find best one/suggest improvements.

import json
import pandas as pd 
from IPython.display import HTML

#Although I don't have 25,000 files, I except errors that may arise by invalid file name. This is the upper limit.
num_games = 25000

wins_dict = {}
games_dict = {}
win_rate_dict = {}
Hitler = 0

#Gets all possible fascist lines and sends them to the json scraper
def init_dicts():
    global wins_dict, games_dict
    for x in range(0, 5):
        for y in range(x + 1, 6):
            for z in range(x + 2, 7):
                wins_dict[str(x) + str(y) + str(z)] = 0
                games_dict[str(x) + str(y) + str(z)] = 0
    
    count_fasc_wins()

#Looks at JSON file and determines if fascists won, and if so what were lines.
def count_fasc_wins():
    global wins_dict, games_dict, Hitler
    for i in range(1, num_games):
        try:
            data = json.loads(open(f"{i}.json").read())
        except:
            continue

        #IMPORTANT: This only looks at standard 7P games.
        if data['customGameSettings']['enabled'] or len(data['players']) != 7:
            continue

        fascists = get_roles(data)

        #Gets sequence of turns, if no turns skip
        log = data['logs']
        if len(log) == 0:
            continue

        last_turn = log[len(log) - 1]
  
        #Win Conditions of last turn
        ended_on_policy = 'enactedPolicy' in last_turn
        ended_on_fasc_policy = ended_on_policy and last_turn['enactedPolicy'] == 'fascist'
        ended_with_heil = 'chancellorId' in str(last_turn) and last_turn['chancellorId'] == Hitler and "specialElection" in str(log)
        ended_with_shot = 'execution' in str(last_turn) and last_turn['execution'] == Hitler

        #If game ended at all, then determine wins
        if ended_on_policy or ended_with_heil or ended_with_shot:
            if ended_with_heil or ended_on_fasc_policy:
                wins_dict[fascists] += 1
                games_dict[fascists] += 1
            if ended_with_shot or (ended_on_policy and not ended_on_fasc_policy):
                games_dict[fascists] += 1

#Helper to parse JSON file and find lines.
def get_roles(data):
    fascist_players = ''
    for player in data['players']:
        if player['role'] == 'fascist':
            fascist_players += str(player['seat'])
        if player['role'] == 'hitler':
            fascist_players += str(player['seat'])
            set_Hitler(player['seat'])
    
    return fascist_players

def set_Hitler(seat):
    global Hitler 
    Hitler = seat

#Gets data, calculates win rate and sends this to output_results.
def main():
    global win_rate_dict, wins_dict, games_dict
    init_dicts()
    win_rate_dict = {}

    for line in wins_dict:
        if games_dict[line] == 0:
            win_rate_dict[line] = 0
        else:
            win_rate_dict[line] = round(wins_dict[line] / games_dict[line], 3)

    return output_results()

#Show resulting data as DataFrame prettyprinted using HTML to drop index
def output_results():
    lines = list(win_rate_dict.keys())
    index = 0
    setting_list = []

    #Skips over potentially repeated lines made by init_dicts
    for key in win_rate_dict.keys():
        if float(win_rate_dict[key]) == float(0):
            index += 1
            continue

        #Append DataFrame
        val_dict = {}
        line_str = str(int(lines[index]) + 111)
        val_dict.update({'Fascist Seat 1' : line_str[0], 'Fascist Seat 2' : line_str[1], 
                        'Fascist Seat 3' : line_str[2], 'Win Rate' : win_rate_dict[key]})
        setting_list.append(val_dict)
        index += 1

    fasc_df = pd.DataFrame(setting_list, columns = ['Fascist Seat 1', 'Fascist Seat 2', 'Fascist Seat 3', 'Win Rate']).sort_values(by = ['Win Rate'], ascending = False)
    return HTML(fasc_df.to_html(index = False))


main()
