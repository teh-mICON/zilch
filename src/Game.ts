import _ from 'lodash'

import Action from './Action'

export enum State {
  IDLE, GATHER, RUNNING, ENDING
}

export class Player {
  score: number
  id: String
  name: String

  constructor(id, name) {
    this.score = 0;
    this.id = id;
    this.name = name;
  }
}

export class Game {
  send: Function;
  state: State;
  players: Player[];
  startedBy: String;
  action: Action;
  turn: Turn;
  player: Player;
  playerNum: number = -1;
  ender: number;

  constructor(send, starterID) {
    this.send = send;
    this.state = State.IDLE;
    this.players = []
    this.startedBy = starterID;
  }

  join(player: Player) {
    if (_.find(this.players, candidate => candidate.id == player.id)) return;
    this.players.push(player);
  }

  start() {
    this.state = State.RUNNING;
    this.playerNum = -1;
    this.next();
  }
  next() {
    if(this.playerNum + 1 >= this.players.length) {
      this.playerNum = -1;
    }
    if (this.state == State.ENDING && this.ender == this.playerNum +1) {
      let winner = _.reverse(_.orderBy(this.players, 'score'))[0];
      this.send(`${winner.name} wins the round with a score of ${winner.score}! Very good.`);
      this.state = State.IDLE;
      this.players = [];
      this.playerNum = -1;
      this.ender = undefined;
      return;
    }
    this.player = this.players[++this.playerNum];
    this.send(`${this.player.name}'s turn. (${this.player.score})`);
    this.turn = new Turn(this.roll(6));
    this.send(this.turn.dice)

    this.action = new Action(this.turn);
    if (!this.action.actionPossible()) {
      this.next();
    }
  }

  gather() {
    this.state = State.GATHER;
  }
  roll(times) {
    return _.times(times, () => {
      let num = Math.random() * 6;
      return Math.ceil(num)
    });
  }

  isActivePlayer(id: String) {
    if (!this.player) return false;
    return this.player.id == id;
  }

  input(input: String) {
    let parser = new Action(this.turn);

    parser.parse(input, () => {
      // roll callback
      this.turn.dice = this.roll(this.turn.dice.length);
      this.send(this.turn.dice);
      if (!this.action.actionPossible()) {
        this.next();
      }
    }, () => {
      // bank callback
      this.player.score += this.turn.points
      if (this.player.score >= 10000) {
        this.state = State.ENDING;
        this.ender = this.playerNum;
        this.send(`${this.player.name} cracked 10k. Last chance to win!`)
      }
      this.next();
    }, () => {
      // zilch callback
      this.next();
    });
  }
}


export class Turn {
  dice: number[];
  points: number;

  constructor(dice: number[]) {
    this.dice = dice;
    this.points = 0;
  }

  has(dice: number[]) {
    let exclude: number[] = [];

    _.each(dice, (die, index) => {
      _.each(this.dice, (candidate, candidateIndex) => {
        if (_.includes(exclude, candidateIndex)) return null;

        if (candidate == die) {
          exclude.push(candidateIndex);
          // return false -> break _.each
          return false;
        }
        return null;
      });
    });
    return dice.length == exclude.length;
  }

  take(dice: number[]) {
    if (!this.has(dice)) {
      throw new Error("can't take what I don't have")
    }
    let exclude: Number[] = [];

    _.each(dice, (die, index) => {
      _.each(this.dice, (candidate, candidateIndex) => {
        if (_.includes(exclude, candidateIndex)) return null;

        if (candidate == die) {
          exclude.push(candidateIndex);
          // return false = break each
          return false;
        }
        return null;
      });
    });
    this.dice = _.filter(this.dice, (die, index) => !_.includes(exclude, index));
  }
}