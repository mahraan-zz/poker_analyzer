$(document).ready(function(){
  "use strict"

  $.get("sample_hand.xml", function(d){

    $("body").append("<h1> Hand Data </h1>")

    var players = {
      "0": "Madeinch1na",
      "1": undefined,
      "2": "Elephant for sale",
      "3": "jakew24",
      "4": "Brejcha",
      "5": "Sept"
    }
    console.log(players)

    function resetHand(hand) {
      hand.rake = 0
      hand.heroHoleCards = ""
      hand.board = []
      hand.preflop = []
      hand.flop = []
      hand.turn = []
      hand.river = []
      hand.showdown = []
    }

    var hand = {
      "hero": "",
      "tableDetails": {
        "game": "TEXAS_HOLDEM",
        "mode": "REALMONEY",
        "limit": "NO_LIMIT"
      },
    }
    resetHand(hand)
    hand.stacks = {
      "Brejcha": 100,
      "Elephant for sale": 101.50,
      "Madeinch1na": 99,
      "Sept": 108.31,
      "jakew24": 122.60
    }

    function addBlinds(xmlElement){

      // add blinds to preflop action list
      xmlElement.find("PlayerAction").each(function(){

        var playerActionElement = $(this)

        // initialize variables
        var id = playerActionElement.attr("seat"),
            smallBlindElement = playerActionElement.find("PostSmallBlind"),
            smallBlindBet = {},
            bigBlindElement = playerActionElement.find("PostBigBlind"),
            bigBlindBet = {}

        // small blind
        if(smallBlindElement.length > 0){
          smallBlindBet[players[id]] = parseFloat(smallBlindElement.attr("amount"))
          hand.preflop.push(smallBlindBet)
        }

        // big blind
        if(bigBlindElement.length > 0){
          bigBlindBet[players[id]] = parseFloat(bigBlindElement.attr("amount"))
          hand.preflop.push(bigBlindBet)
        }

      })
    }

    function recordBetting(xmlElement, street){
      // potential actions
      var checkElement = xmlElement.find("Check"),
          callElement = xmlElement.find("Call"),
          betElement = xmlElement.find("Bet"),
          raiseElement = xmlElement.find("Raise"),
          foldElement = xmlElement.find("Fold"),
          action = {}
      // check
      if(checkElement.length > 0){
        var id = checkElement.parent().attr("seat")
        action[players[id]] = 0
        street.push(action)
      }
      // call
      if(callElement.length > 0){
        var id = callElement.parent().attr("seat")
        action[players[id]] = parseFloat(callElement.attr("amount"))
        street.push(action)
      }
      // bet
      if(betElement.length > 0){
        var id = betElement.parent().attr("seat")
        action[players[id]] = parseFloat(betElement.attr("amount"))
        street.push(action)
      }
      // raise
      if(raiseElement.length > 0){
        var id = raiseElement.parent().attr("seat")
        action[players[id]] = parseFloat(raiseElement.attr("amount"))
        street.push(action)
      }
      // fold
      if(foldElement.length > 0){
        var id = foldElement.parent().attr("seat")
        action[players[id]] = "fold"
        street.push(action)
      }
    }

    function updateStacks(xmlElement){
      xmlElement.find("Pot").each(function(){
        var id = $(this).attr("seat")
        var totalBetThisStreet = parseFloat($(this).attr("change"))
        hand.stacks[players[id]] -= totalBetThisStreet
      })
    }

    function updateRake(xmlElement){
      var rake = parseFloat(xmlElement.find("Rake").attr("change"))
      var jackpotFee = parseFloat(xmlElement.find("JackpotFee").attr("change"))
      hand.rake += rake + jackpotFee
    }

    function updateBoard(xmlElement, dealingElementTagName){
      if(xmlElement.find(dealingElementTagName).length > 0){
        xmlElement.find("Card").each(function(){
          hand.board.push($(this).text())
        })
      }
    }

    function checkForWinners(xmlElement){

    }

    // newHand, preflop, flop, turn, river, showdown, endHand
    var handProgress = "newHand"

    $(d).find("Message").each(function(){

       switch (handProgress) {

        // ==[NEW HAND]========================================================
        case "newHand":

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

            // check for winners


            // update board
            updateBoard(flopUpdateElement, "DealingFlop")

            // record betting actions
            recordBetting(flopUpdateElement, hand.flop)
            
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

            // update board
            updateBoard(turnUpdateElement, "DealingTurn")

            // record betting actions
            recordBetting(turnUpdateElement, hand.turn)
            
            // check if betting is over
            if(turnUpdateElement.find("PotsChange").length > 0){
              handProgress = "river"  // move state to river
              updateStacks(turnUpdateElement) // update stacks based on bets
              updateRake(turnUpdateElement) // update rake
              
              // print
              console.log("end of turn")
              console.log(hand)

            }
          })
          break
        
        // ==[RIVER]==========================================================
        case "river": // look for river actions
          $(this).find("Changes").each(function(){

            var riverUpdateElement = $(this)

            // update board
            updateBoard(riverUpdateElement, "DealingRiver")

            // record betting actions
            recordBetting(riverUpdateElement, hand.river)
            
            // check if betting is over
            if(riverUpdateElement.find("PotsChange").length > 0){
              handProgress = "endHand"  // move state to endHand
              updateStacks(riverUpdateElement) // update stacks based on bets
              updateRake(riverUpdateElement) // update rake
              
              // print
              console.log("end of river")

            }
          })
          break
        
        case "endHand": // send hand to server
          break

        default:
          console.log("Hand logic broken")
      }

    });
  });

});