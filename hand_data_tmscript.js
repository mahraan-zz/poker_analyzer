// ==UserScript==
// @name         Save Betonline Hand Data
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://poker.betonline.ag/desktoppoker/index.htm?ID=*
// @grant        none
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require https://goessner.net/download/prj/jsonxml/json2xml.js
// @require https://goessner.net/download/prj/jsonxml/xml2json.js
// ==/UserScript==

(function() {
	'use strict'
	var OrigWebSocket = window.WebSocket
	var callWebSocket = OrigWebSocket.apply.bind(OrigWebSocket)
	var wsAddListener = OrigWebSocket.prototype.addEventListener
	wsAddListener = wsAddListener.call.bind(wsAddListener)

	// ==[functions]===========================================================

	// resets hand object after end of hand, called when EndHand message is received
	function resetHand(hand) {
		hand.rake = 0 // includes rake + jackpot fee
		hand.heroHoleCards = []
		hand.board = []
		hand.preflop = []
		hand.flop = []
		hand.turn = []
		hand.river = []
		hand.showdown = []
	}

	// add blinds to preflop action list, parses informaion from NewHand message
	function addBlinds(xmlElement){

		xmlElement.find("PlayerAction").each(function(){

			var playerActionElement = $(this)

			// initialize variables
			var seat_id = playerActionElement.attr("seat"),
				smallBlindElement = playerActionElement.find("PostSmallBlind"),
				bigBlindElement = playerActionElement.find("PostBigBlind"),
				smallBlindBetJSON = {},
				bigBlindBetJSON = {}

			// small blind
			if(smallBlindElement.length > 0){
				smallBlindBetJSON[players[seat_id]] = parseFloat(smallBlindElement.attr("amount"))
				hand.preflop.push(smallBlindBetJSON)
			}

			// big blind
			if(bigBlindElement.length > 0){
				bigBlindBetJSON[players[seat_id]] = parseFloat(bigBlindElement.attr("amount"))
				hand.preflop.push(bigBlindBetJSON)
			}

		})
	}

	// record username and amount for various betting actions on a street, parses action messages during all streets
	function recordBetting(xmlElement, street){
		// looks for elements corresponding to potential actions
		var checkElement = xmlElement.find("Check"),
			callElement = xmlElement.find("Call"),
			betElement = xmlElement.find("Bet"),
			raiseElement = xmlElement.find("Raise"),
			foldElement = xmlElement.find("Fold"),
			actionJSON = {}
		// check
		if(checkElement.length > 0){
			var seat_id = checkElement.parent().attr("seat")
			actionJSON[players[seat_id]] = 0 // check equal to a bet of 0, create JSON with username associated with id
			street.push(actionJSON)
		}
		// call
		if(callElement.length > 0){
			var seat_id = callElement.parent().attr("seat")
			actionJSON[players[seat_id]] = parseFloat(callElement.attr("amount")) // find amount for call, create JSON with username associated with id
			street.push(actionJSON)
		}
		// bet
		if(betElement.length > 0){
			var seat_id = betElement.parent().attr("seat")
			actionJSON[players[seat_id]] = parseFloat(betElement.attr("amount")) // find amount for initial bet, create JSON with username associated with id
			street.push(actionJSON)
		}
		// raise
		if(raiseElement.length > 0){
			var seat_id = raiseElement.parent().attr("seat")
			actionJSON[players[seat_id]] = parseFloat(raiseElement.attr("amount")) // find amount for raise bet, create JSON with username associated with id
			street.push(actionJSON)
		}
		// fold
		if(foldElement.length > 0){
			var seat_id = foldElement.parent().attr("seat")
			actionJSON[players[seat_id]] = "fold" // set as bet, create JSON with username associated with id
			street.push(actionJSON)
		}
	}

	// update player stacks, parses message at the end of every street
	function updateStacks(xmlElement){
		xmlElement.find("Pot").each(function(){
			var seat_id = $(this).attr("seat")
			var totalBetThisStreet = parseFloat($(this).attr("change"))
			hand.stacks[players[seat_id]] -= totalBetThisStreet
		})
	}

	// update rake taken in hand, parses message sent at the end of every street
	function updateRake(xmlElement){
		var rake = 0,
			jackpotFee = 0
		if(xmlElement.find("Rake").length > 0){ // check to see if Rake element exists
			rake = parseFloat(xmlElement.find("Rake").attr("change"))
		}
		if(xmlElement.find("JackpotFee").length > 0){ // checks to see if JackpotFee element exists (not all hands are part of a jackpot)
			jackpotFee = parseFloat(xmlElement.find("JackpotFee").attr("change"))
		}
		hand.rake += rake + jackpotFee
	}

	// searches for unique updating element for each street (e.g. DealingFlop, DealingTurn, DealingRiver) and updates hand.board
	function updateBoard(xmlElement, dealingElementTagName){
		if(xmlElement.find(dealingElementTagName).length > 0){
			xmlElement.find("Card").each(function(){
				hand.board.push($(this).text())
			})
		}
	}

	// searches for unique updating element for each street if everyone checks
	function changeState(xmlElement, dealingElementTagName, currentStreet, nextStreet){
		if(xmlElement.find(dealingElementTagName).length > 0){
            console.log("everyone checks")
            console.log("end of " + currentStreet)
			handProgress = nextStreet
			updateBoard(xmlElement, dealingElementTagName)
		}
	}

	// parses Winner element and updates winner's stack size, sets the end of the hand
	function updateWinnerStack(xmlElement){
		if(xmlElement.find("Winner").length > 0){
			var winnerElement = xmlElement.find("Winner"),
				seat_id = winnerElement.attr("seat")
			hand.stacks[players[seat_id]] += parseFloat(winnerElement.attr("amount"))
			handProgress = "endHand" // move state to endHand
		}
	}

	// checks for a showdown and updates shown and mucked hands, in order
	function checkShowdown(xmlElement){

		// check for a showdown happening
		if(xmlElement.find("Show").length > 0 || xmlElement.find("Muck").length > 0){

			xmlElement.find("PlayerAction").each(function(){

				// initialize variables
				var playerActionElement = $(this),
					showdownCardsJSON = {}

				// show
				if(playerActionElement.find("Show").length > 0){
					// initialize variables
					var showElement = playerActionElement.find("Show"),
						seat_id = playerActionElement.attr("seat"),
						cards = []
					// get shown cards
					showElement.find("Card").each(function(){
						cards.push($(this).text())
					})
					// save showdown cards
					showdownCardsJSON[players[seat_id]] = cards
					hand.showdown.push(showdownCardsJSON)
				}

				// muck
				if(playerActionElement.find("Muck").length > 0){
					// initialize variables
					var seat_id = playerActionElement.attr("seat")
					// save showdown muck action
					showdownCardsJSON[players[seat_id]] = "muck"
					hand.showdown.push(showdownCardsJSON)
				}
			})
		}
	}

	// ==[global variables]====================================================

	var table_id = location.search.substr(4),
		players = {},
		handProgress = "newHand",
		hand = {
			"hero": "",
			"stacks": {}
		}
	resetHand(hand)

	window.WebSocket = function WebSocket(url, protocols) {
		var ws;
		if (!(this instanceof WebSocket)) {
			ws = callWebSocket(this, arguments) // Called without 'new' (browsers will throw an error)
		} else if (arguments.length === 1) {
			ws = new OrigWebSocket(url)
		} else if (arguments.length >= 2) {
			ws = new OrigWebSocket(url, protocols)
		} else {
			ws = new OrigWebSocket() // No arguments (browsers will throw an error)
		}
		// Do something with event.data (received data) if you wish.
		wsAddListener(ws, 'message', function(event) {

			var d = $.parseXML(event.data)
			console.log(d)

			// initialize stacks, players, and table meta-data
			$(d).find("TableDetails").each(function(){

				console.log($(this)[0])

				// table meta-data
				hand.game = $(this).find("SingleTable").attr("game")
				hand.limit = $(this).find("SingleTable").attr("limit")

				// initialize stacks and players
				$(this).find("Seat").each(function(){
					var seatElement = $(this),
						nickname = seatElement.find("PlayerInfo").attr("nickname")
					players[seatElement.attr("id")] = nickname;
					if(nickname != null){
						hand.stacks[nickname] = parseFloat(seatElement.find("Chips").attr("stack-size"))
					}
				})
				console.log(hand)
			})

			// game updates
			$(d).find("Message").each(function(){

				switch (handProgress) {

					// ==[NEW HAND]========================================================
					case "newHand":

						// update game state
						if($(this).find("GameState").length > 0){

							$(this).find("Seat").each(function(){
								var seatElement = $(this),
									nickname = seatElement.find("PlayerInfo").attr("nickname")
								players[seatElement.attr("id")] = nickname;
								if(nickname != null){
									hand.stacks[nickname] = parseFloat(seatElement.find("Chips").attr("stack-size"))
								}
							})
						}

						// initiate new hand and add blinds
						if($(this).find("NewHand").length > 0){
							handProgress = "preflop"
							addBlinds($(this))
						}
						break

					// ==[PREFLOP]=========================================================
					case "preflop":

						$(this).find("Changes").each(function(){

							var preflopUpdateElement = $(this)

							// record betting actions
							recordBetting(preflopUpdateElement, hand.preflop)

							// check if betting is over
							if(preflopUpdateElement.find("PotsChange").length > 0){
								handProgress = "flop" // move state to flop
								updateStacks(preflopUpdateElement) // update stacks based on bets
								updateRake(preflopUpdateElement) // update rake

								// print
								console.log("end of preflop")
							}
						})
						break

					// ==[FLOP]===========================================================
					case "flop": // look for flop actions

						$(this).find("Changes").each(function(){

							var flopUpdateElement = $(this)

							// check for showdown
							checkShowdown(flopUpdateElement)

							// check for winners, and update stack as necessary
							updateWinnerStack(flopUpdateElement)

							// update board
							updateBoard(flopUpdateElement, "DealingFlop")

							// record betting actions
							recordBetting(flopUpdateElement, hand.flop)

							// update state if all bets are checks
							changeState(flopUpdateElement, "DealingTurn", "flop", "turn", )

							// check if betting is over
							if(flopUpdateElement.find("PotsChange").length > 0){
								handProgress = "turn"  // move state to turn
								updateStacks(flopUpdateElement) // update stacks based on bets
								updateRake(flopUpdateElement) // update rake

								// print
								console.log("end of flop")

							}
						})
						break

					// ==[TURN]===========================================================
					case "turn": // look for turn actions

						$(this).find("Changes").each(function(){

							var turnUpdateElement = $(this)

							// check for showdown
							checkShowdown(turnUpdateElement)

							// check for winners, and update stack as necessary
							updateWinnerStack(turnUpdateElement)

							// update board
							updateBoard(turnUpdateElement, "DealingTurn")

							// record betting actions
							recordBetting(turnUpdateElement, hand.turn)

							// update state if all bets are checks
							changeState(turnUpdateElement, "DealingRiver", "turn", "river")

							// check if betting is over
							if(turnUpdateElement.find("PotsChange").length > 0){
								handProgress = "river"  // move state to river
								updateStacks(turnUpdateElement) // update stacks based on bets
								updateRake(turnUpdateElement) // update rake

								// print
								console.log("end of turn")

							}
						})
						break

					// ==[RIVER]==========================================================
					case "river": // look for river actions
						$(this).find("Changes").each(function(){

							var riverUpdateElement = $(this)

							// check for showdown
							checkShowdown(riverUpdateElement)

							// check for winners, and update stack as necessary
							updateWinnerStack(riverUpdateElement)

							// update board
							updateBoard(riverUpdateElement, "DealingRiver")

							// record betting actions
							recordBetting(riverUpdateElement, hand.river)

							// check if betting is over
							if(riverUpdateElement.find("PotsChange").length > 0){
								updateStacks(riverUpdateElement) // update stacks based on bets
								updateRake(riverUpdateElement) // update rake

								// print
								console.log("end of river")

							}
						})
						break

					// ==[END HAND]=======================================================
					case "endHand": // send hand to server

						$(this).find("Changes").each(function(){

							var endHandElement = $(this)

							// check if hand is over
							if(endHandElement.find("EndHand").length > 0){
								// reset hand
								handProgress = "newHand" // move state to newHand
								console.log(JSON.stringify(hand))
								// [TODO] send hand object to server
								resetHand(hand)
								console.log("end of hand")
							}
						})
						break

					default:
						console.log("Hand logic broken")
				}
			})
		})
		return ws
	}.bind()
	window.WebSocket.prototype = OrigWebSocket.prototype
	window.WebSocket.prototype.constructor = window.WebSocket

	var wsSend = OrigWebSocket.prototype.send
	wsSend = wsSend.apply.bind(wsSend)
	OrigWebSocket.prototype.send = function(data){
		// TODO: Do something with the sent data if you wish.
		return wsSend(this, arguments)
	}

})()