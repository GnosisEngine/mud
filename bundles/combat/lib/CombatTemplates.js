'use strict';

/**
 * CombatTemplates
 *
 * All narrative strings for the numberless combat system.
 *
 * Interpolation tokens:
 *   {attacker}  — name of the attacking entity
 *   {target}    — name of the defending entity
 *
 * Ranvier color tags used for damage tier emphasis:
 *   graze      — no markup (subtle, barely registered)
 *   light      — no markup (felt, but not alarming)
 *   moderate   — <yellow>key impact word</yellow>
 *   heavy      — <b><yellow>key phrase</yellow></b>
 *   severe     — <b><red>key phrase</red></b>
 *   devastating — <b><red>entire sentence</red></b>
 *
 * Fallback resolution order (selectors handle this):
 *   hit[pov][attackType][damageTier][armorType]
 *     → hit[pov][attackType][damageTier]['generic']
 *     → hit[pov]['generic'][damageTier]['generic']
 *
 *   avoid[pov][avoidType][ease]
 *     → avoid[pov]['generic'][ease]
 *
 *   arc[stage]            (always has entries, no fallback needed)
 *   exhaustion[pov][tier] (always has entries)
 *   clarity[tier]         (always has entries)
 *   heal[pov][magnitude]  (always has entries)
 */

const T = {

  // HIT TEMPLATES
  // Structure: hit[pov][attackType][damageTier][armorType] = string[]
  // pov: 'attacker' (you struck them) | 'target' (they struck you)

  hit: {

    // POV: ATTACKER  (you are doing the hitting)
    attacker: {

      bladed: {
        graze: {
          plate: [
            'Your blade skips off {target}\'s pauldron with a hollow ring. No harm done.',
            'The edge catches {target}\'s armor at the wrong angle and glances away.',
            'A scrape across {target}\'s breastplate — the metal holds without question.',
          ],
          chain: [
            'Your blade drags across {target}\'s mail. The rings flex and shed the blow.',
            'The edge finds the links of {target}\'s chainmail and slides off without purchase.',
          ],
          leather: [
            'Your blade draws a thin line across {target}\'s leather. Surface only.',
            'A glancing cut — {target}\'s leather turns most of it. They barely register the contact.',
          ],
          bare: [
            'Your blade drags across {target}\'s skin, raising a line that barely breaks the surface.',
            'A nick. {target} flinches but it\'s nothing to worry about.',
          ],
          scales: [
            'Your blade skitters across {target}\'s scales without finding a seam.',
            'The edge turns on {target}\'s natural armor. It might as well be stone.',
          ],
          ethereal: [
            'Your blade passes through the edge of {target}\'s form. They ripple like disturbed water.',
            'A glancing contact with {target}\'s ethereal body — they shudder and reform immediately.',
          ],
          generic: [
            'Your blade finds {target} but barely. The contact is real but forgettable.',
            'A glancing stroke across {target}. Neither of you is much the worse for it.',
          ],
        },

        light: {
          plate: [
            'Your blade bites into the seam of {target}\'s armor. Not deep, but felt.',
            'A clean draw across {target}\'s chestplate — the metal holds, but the force carries through.',
            'You find a gap at {target}\'s collar. Small, but you put something into it.',
          ],
          chain: [
            'Your blade catches in {target}\'s mail and drags. A few rings give. Not many.',
            'You slip the point between links of {target}\'s chainmail. Shallow, but real.',
          ],
          leather: [
            'Your sword opens a line in {target}\'s leather. It\'ll sting through the padding.',
            '{target}\'s leather armor slows your blade but doesn\'t stop it.',
          ],
          bare: [
            '{target}\'s forearm catches your blade — not how they intended, but it stops the worst of it.',
            'A cut across {target}\'s shoulder. It\'ll bleed more than it hurts, for now.',
          ],
          scales: [
            'You find a thin gap between {target}\'s scales and work the edge in a little.',
            'The blade slips under a loose scale on {target}\'s flank. Not deep.',
          ],
          ethereal: [
            'Your blade disrupts {target}\'s form along one edge. The shape of them wavers.',
            'You push your sword into {target}\'s body and feel the resistance of whatever they\'re made of.',
          ],
          generic: [
            'You land a blow on {target}. Light, but you\'re finding your range.',
            'Your strike connects with {target}. A start.',
          ],
        },

        moderate: {
          plate: [
            'Your blade <yellow>wedges</yellow> into {target}\'s shoulder joint and drags. They stumble from the weight of it.',
            'A <yellow>clean strike</yellow> against {target}\'s chestplate — the metal holds, but the force rocks them back.',
            'You find the gap under {target}\'s arm. The blade goes in and they <yellow>adjust their footing</yellow>.',
          ],
          chain: [
            'Your blade <yellow>parts the rings</yellow> of {target}\'s mail and opens the flesh beneath.',
            'You work the point through {target}\'s chainmail. It gives way. So does what\'s underneath.',
          ],
          leather: [
            'Your sword <yellow>opens a gash</yellow> through {target}\'s leather. Blood wells up immediately.',
            'You slash through the strap work on {target}\'s armor. The cut is real and they feel every inch of it.',
          ],
          bare: [
            'Your blade <yellow>opens {target}\'s forearm</yellow>. The wound isn\'t deep but it\'s immediate.',
            'A slash across {target}\'s chest — there\'s nothing between your edge and them, and it shows.',
          ],
          scales: [
            'You drive the blade through a gap in {target}\'s scales. The flesh underneath is <yellow>softer than it looks</yellow>.',
            'Your sword <yellow>levers up a scale</yellow> on {target}\'s shoulder and bites underneath.',
          ],
          ethereal: [
            'Your sword <yellow>tears through</yellow> a portion of {target}\'s form. They come apart at the wound, briefly.',
            'A solid push into {target}\'s midsection. The light inside them <yellow>gutters</yellow> and they recoil.',
          ],
          generic: [
            'Your blade <yellow>finds {target} cleanly</yellow>. That one landed.',
            'A real strike against {target}. You can feel the difference from your previous swings.',
          ],
        },

        heavy: {
          plate: [
            'Your sword <b><yellow>punches through {target}\'s breastplate</yellow></b>. The metal cracks with a sound like a bell. They reel.',
            '<b><yellow>A brutal downstroke</yellow></b> — {target}\'s armor absorbs the worst but they drop to one knee from the blow.',
            'You drive the blade through {target}\'s pauldron. The joint <b><yellow>gives with a sound</yellow></b> they\'ll remember.',
          ],
          chain: [
            'Your blade <b><yellow>shreds through {target}\'s mail</yellow></b> like it was cloth and keeps going.',
            '{target}\'s chainmail explodes apart where you strike. The wound underneath is <b><yellow>significant</yellow></b>.',
          ],
          leather: [
            'Your blade <b><yellow>parts {target}\'s hide armor</yellow></b> like it isn\'t there. They grunt and press a hand to it.',
            'A deep slash across {target}\'s flank. The leather offered <b><yellow>nothing</yellow></b>. They\'re bleeding freely now.',
          ],
          bare: [
            'Your sword <b><yellow>opens {target}</yellow></b> across the ribs. The wound is wide and the reaction immediate.',
            '<b><yellow>Deep and certain</yellow></b> — your blade finds {target} with nothing to slow it. They stagger hard.',
          ],
          scales: [
            'You <b><yellow>hammer through {target}\'s natural armor</yellow></b>. Whatever it took to get through, it was worth it.',
            'Your blade finds the soft underbelly beneath {target}\'s scales. The scale <b><yellow>tears free</yellow></b> as you pull back.',
          ],
          ethereal: [
            'Your sword <b><yellow>tears a ragged hole</yellow></b> through {target}\'s form. The light inside spills and dims.',
            '{target} <b><yellow>unravels</yellow></b> at the point of impact. They struggle visibly to hold themselves together.',
          ],
          generic: [
            '<b><yellow>You hit {target} hard</yellow></b>. That one counted.',
            'A <b><yellow>heavy blow</yellow></b> that snaps {target}\'s head back and puts them on the defensive.',
          ],
        },

        severe: {
          plate: [
            '<b><red>Your blade tears through {target}\'s gorget and doesn\'t stop.</red></b> Blood follows the edge as they spin away.',
            '<b><red>The stroke is devastating</red></b> — {target}\'s armor shatters at the joint and they cry out, barely keeping their feet.',
          ],
          chain: [
            '<b><red>Your sword parts {target}\'s mail and buries itself to the hilt.</red></b> They make a sound that has no name.',
            '<b><red>The chainmail was no obstacle.</red></b> {target} folds around the blow and takes a long moment to straighten.',
          ],
          leather: [
            '<b><red>Your blade opens {target} from shoulder to hip.</red></b> The sound is worse than the sight.',
            '<b><red>The leather gave nothing.</red></b> {target}\'s wound is deep and they know it.',
          ],
          bare: [
            '<b><red>There is nothing between your sword and {target}\'s flesh.</red></b> The result is immediate and terrible.',
            '<b><red>You cut {target} wide open.</red></b> They stagger, breathing hard, hand going to the wound without thinking.',
          ],
          scales: [
            '<b><red>Your blade rips through {target}\'s natural armor</red></b> and the wound it leaves is ugly.',
            '<b><red>You drive through {target}\'s defenses entirely</red></b> — scale, flesh, and whatever lies beneath.',
          ],
          ethereal: [
            '<b><red>Your sword shears through {target}\'s form</red></b> and the light inside them dims significantly.',
            '<b><red>{target} comes apart</red></b> at the point of impact. Reconstituting takes them effort and time.',
          ],
          generic: [
            '<b><red>You hit {target} with everything you have</red></b> and most of it lands.',
            '<b><red>A severe blow</red></b> — {target} staggers, their guard blown open, expression telling the full story.',
          ],
        },

        devastating: {
          plate:   ['<b><red>You drive your sword through {target}\'s breastplate like paper. They don\'t make a sound. They simply fall.</red></b>'],
          chain:   ['<b><red>Your blade tears through {target}\'s mail as though it were decorative, and what follows is catastrophic.</red></b>'],
          leather: ['<b><red>The leather meant nothing. Your blow opens {target} in a way that settles the question of this fight.</red></b>'],
          bare:    ['<b><red>Unarmored and caught clean — {target} receives the full weight of your blade and the fight changes its nature entirely.</red></b>'],
          scales:  ['<b><red>You split {target}\'s natural armor down the center and the wound beneath is enough to stop anyone.</red></b>'],
          ethereal:['<b><red>Your blade tears through {target}\'s form and they come apart — the light inside them scattered, struggling to return.</red></b>'],
          generic: ['<b><red>The blow lands with absolute finality. {target} has no answer for it.</red></b>'],
        },
      }, // end bladed/attacker

      bludgeoning: {
        graze: {
          plate: [
            'Your mace glances off {target}\'s helm. Their head turns with the impact but they shake it off.',
            'A clumsy swing that catches the edge of {target}\'s pauldron — more noise than damage.',
          ],
          chain: [
            'Your weapon clips {target}\'s mail. The rings spread the force. They feel it but don\'t show it.',
          ],
          leather: [
            'A light thump against {target}\'s leather — padded and absorbed, barely registers.',
          ],
          bare: [
            'Your fist clips {target}\'s jaw. Not square — they roll with it.',
            'A glancing blow that catches {target}\'s shoulder. They rub it. That\'s all.',
          ],
          scales: [
            'Your weapon thumps against {target}\'s scales and bounces back. Like hitting stone.',
          ],
          ethereal: [
            'Your strike passes partially through {target}, disturbing the shape of them. Not much, but something.',
          ],
          generic: [
            'Your blow catches {target} at an awkward angle. The force lands without much consequence.',
          ],
        },

        light: {
          plate: [
            'Your weapon rings off {target}\'s helm. They stagger half a step, annoyed.',
            'A solid thump against {target}\'s breastplate. The armor distributes it but they feel the weight.',
          ],
          chain: [
            'Your mace crushes into {target}\'s mail, driving links into flesh. Bruising underneath.',
          ],
          leather: [
            'A dull impact against {target}\'s padded armor. Something transmitted through.',
          ],
          bare: [
            'You catch {target} in the ribs. Nothing broken, but they\'ll know it was there.',
            'A jab that connects with {target}\'s temple — they blink hard and reassess you.',
          ],
          scales: [
            'Your weapon cracks against {target}\'s scales. One or two of them shift. A start.',
          ],
          ethereal: [
            'Your blow disrupts {target}\'s form along its edge. They contract inward from the contact.',
          ],
          generic: [
            'You land a hit on {target}. The weight carries through.',
          ],
        },

        moderate: {
          plate: [
            'You bring your weapon down on {target}\'s shoulder. The plate holds, but the bone underneath <yellow>takes the shock</yellow>.',
            'The force of your strike <yellow>reverberates up your arm</yellow> to your teeth. {target} staggers, dazed.',
          ],
          chain: [
            'Your mace <yellow>hammers the mail flat</yellow> against {target}\'s ribs. They grunt and double slightly.',
          ],
          leather: [
            'A <yellow>solid thump</yellow> into {target}\'s padded flank. The leather helps but the weight doesn\'t care.',
          ],
          bare: [
            'Your weapon <yellow>connects flush</yellow> against {target}\'s temple. They stagger sideways.',
            'You hammer {target} across the collarbone. Something <yellow>pops</yellow> under the impact.',
          ],
          scales: [
            'Your blow <yellow>cracks through {target}\'s natural armor</yellow>. Several scales split and fragment.',
          ],
          ethereal: [
            'Your strike disrupts {target}\'s center. The form they hold <yellow>buckles inward</yellow> at the point of impact.',
          ],
          generic: [
            'You <yellow>land a real blow</yellow> on {target}. The impact travels through them.',
          ],
        },

        heavy: {
          plate: [
            'Your blow <b><yellow>hammers {target}\'s helm inward</yellow></b>. The sound is enormous. They go to one knee.',
            '<b><yellow>The impact shakes them to their boots</yellow></b> — {target}\'s armor held but the force transmitted entirely.',
          ],
          chain: [
            'You <b><yellow>drive your weapon through the mail</yellow></b>, crushing the links and the flesh together.',
          ],
          leather: [
            'A <b><yellow>devastating impact</yellow></b> into {target}\'s side. The padding was never designed for this.',
          ],
          bare: [
            'Your blow lands <b><yellow>flush against {target}\'s jaw</yellow></b>. Something cracks. They spin and barely catch themselves.',
            'You hammer {target} square in the ribs. The wet crunch says <b><yellow>something gave way</yellow></b>.',
          ],
          scales: [
            '<b><yellow>You crack through {target}\'s natural armor</yellow></b> and the exposed wound beneath is significant.',
          ],
          ethereal: [
            '<b><yellow>Your strike tears through {target}\'s form</yellow></b> and the light inside them stutters.',
          ],
          generic: [
            '<b><yellow>A heavy, crashing blow</yellow></b> against {target} that sends them staggering.',
          ],
        },

        severe: {
          plate:   ['<b><red>Your weapon caves in {target}\'s pauldron entirely.</red></b> The arm beneath stops working the way it should.'],
          chain:   ['<b><red>You hammer through {target}\'s mail</red></b> in a way that bends them double and keeps them there.'],
          leather: ['<b><red>The padding was a suggestion.</red></b> Your blow finds {target} through all of it and they fold.'],
          bare:    ['<b><red>You hit {target} with enough force to rattle bones they don\'t even use.</red></b> They hit the ground.'],
          scales:  ['<b><red>Your weapon shatters a section of {target}\'s natural armor</red></b> and the wound underneath is enough to end a lesser fight.'],
          ethereal:['<b><red>{target}\'s form collapses inward</red></b> at the strike. Reconstituting is going to take more than a moment.'],
          generic: ['<b><red>A severe and decisive blow.</red></b> {target} absorbs it but the cost is written on their face.'],
        },

        devastating: {
          plate:   ['<b><red>The impact folds {target}\'s armor around them like cloth. The sound carries across the whole area.</red></b>'],
          bare:    ['<b><red>Your blow catches {target} clean and unguarded. There is no recovering from a hit like that cleanly.</red></b>'],
          generic: ['<b><red>You bring everything to bear and {target} receives all of it. The blow ends the argument.</red></b>'],
        },
      }, // end bludgeoning/attacker

      piercing: {
        graze: {
          plate:   ['Your thrust skates off {target}\'s breastplate. The steel turned it perfectly.'],
          chain:   ['The point snags in {target}\'s mail but doesn\'t penetrate. You pull back and reassess.'],
          leather: ['Your thrust finds {target}\'s leather and sticks an inch before stopping.'],
          bare:    ['The point draws a thin red line across {target}\'s forearm. More alarming than dangerous.'],
          scales:  ['Your thrust pings off {target}\'s scales. The angle was wrong.'],
          ethereal:['Your weapon passes mostly through {target} without catching on anything solid.'],
          generic: ['A thrust that finds {target} at the wrong angle. Noted. Try again.'],
        },
        light: {
          plate:   ['You find a joint in {target}\'s armor and push the point in. Not deep.'],
          chain:   ['Your thrust drives through a link in {target}\'s mail. The wound is narrow but it\'s there.'],
          leather: ['Your weapon punches through {target}\'s leather and into the padding beneath.'],
          bare:    ['A clean puncture — {target} sucks in a breath and checks the wound.'],
          scales:  ['You work the point between two of {target}\'s scales. Just inside the boundary.'],
          ethereal:['Your weapon finds something to push against in {target}\'s form. It pushes back.'],
          generic: ['The thrust connects with {target}. A narrow wound but a real one.'],
        },
        moderate: {
          plate:   ['Your point <yellow>drives through the armpit joint</yellow> of {target}\'s armor. They grunt and twist away.'],
          chain:   ['You force the tip through {target}\'s mail and into the meat beneath. <yellow>A real puncture.</yellow>'],
          leather: ['Your weapon <yellow>punches clean through {target}\'s leather</yellow> and they feel the full depth of it.'],
          bare:    ['A <yellow>deep thrust</yellow> into {target}\'s flank. The wound is narrow but it\'s in the right place to matter.'],
          scales:  ['You <yellow>lever apart two scales</yellow> and drive through the gap. {target} doesn\'t like it at all.'],
          ethereal:['Your weapon <yellow>pushes deep into {target}\'s form</yellow> and disrupts something fundamental about their structure.'],
          generic: ['The thrust finds {target} <yellow>clean and with real depth</yellow>. They know it.'],
        },
        heavy: {
          plate:   ['You drive the point <b><yellow>through {target}\'s gorget</yellow></b>. The plate was there. It didn\'t help.'],
          chain:   ['<b><yellow>The point punches through</yellow></b> {target}\'s mail and deep into the shoulder beneath.'],
          bare:    ['<b><yellow>A clean thrust to the center of mass</yellow></b> — {target} gasps and folds slightly around the wound.'],
          generic: ['<b><yellow>You push the weapon deep into {target}</yellow></b> and pull it free already bloody.'],
        },
        severe: {
          plate:   ['<b><red>You find the gap between {target}\'s gorget and helm and drive through without hesitation.</red></b>'],
          bare:    ['<b><red>The thrust goes in clean and comes out worse.</red></b> {target} doubles over and doesn\'t straighten.'],
          generic: ['<b><red>A piercing blow that finds the center of {target} and doesn\'t apologize for it.</red></b>'],
        },
        devastating: {
          generic: ['<b><red>You drive your weapon into {target} to the hilt and the fight answers itself.</red></b>'],
        },
      }, // end piercing/attacker

      bite: {
        graze: {
          plate:   ['Your teeth catch the edge of {target}\'s pauldron. That mostly hurt you.'],
          leather: ['You clamp down on {target}\'s leather vambrace. The padding saves them — barely.'],
          bare: [
            'Your teeth find {target}\'s forearm. A warning nip, but they feel it as one.',
            'A snap at {target}\'s shoulder — you graze skin but don\'t hold.',
            'You lunge for {target}\'s throat and catch only air and collar.',
            'Your bite finds the edge of {target}. Enough to sting. Not enough to matter.',
            '{target} pulls back just fast enough. Your teeth close on nothing useful.',
          ],
          scales:  ['Your bite clatters off {target}\'s scales. Hard. Your jaw aches.'],
          generic: [
            'You bite {target} but don\'t find anything worth biting.',
            'A snap at {target} that connects without consequence.',
            'Your teeth graze {target}. They flinch. That\'s all.',
            '{target} moves just enough. You get the edge of them and nothing more.',
            'You find {target} with your teeth but the angle is wrong. Both of you know it.',
          ],
        },
        light: {
          leather: ['Your teeth find the gap in {target}\'s vambrace. Not deep, but the skin breaks.'],
          bare: [
            'You catch {target}\'s forearm and hold for a moment before they pull free. A real mark left behind.',
            'A quick bite to {target}\'s shoulder — they shake you off, but they\'ll feel it.',
            'Your teeth find {target}\'s calf. A solid nip. They stumble a step.',
            'You snap at {target}\'s wrist and connect. They yank their arm back.',
            '{target} doesn\'t get clear in time. You get a mouthful of them and leave a mark.',
          ],
          scales:  ['You find a thin seam between {target}\'s scales and work your teeth into it briefly.'],
          generic: [
            'Your bite lands on {target}. Light, but you drew something.',
            'You get {target} — not where you wanted, but it counts.',
            'A glancing bite that still connects. {target} adjusts their guard.',
            'You snap at {target} and land it. Not enough to stop them. Enough to remind them.',
            '{target} catches your bite on the worst available part of them. Still a wound.',
          ],
        },
        moderate: {
          leather: ['You bite through {target}\'s leather vambrace and into the arm beneath. They wrench free, cursing.'],
          bare:    ['Your teeth <yellow>find purchase</yellow> in {target}\'s shoulder and clamp down. They struggle against it.'],
          generic: ['A <yellow>real bite</yellow> — you find the soft place and use it. {target} has a new wound.'],
        },
        heavy: {
          leather: ['You clamp down <b><yellow>through {target}\'s leather and into the arm beneath</yellow></b>. They scream and wrench free.'],
          bare:    ['<b><yellow>Your bite goes deep into {target}\'s calf</yellow></b>. You hold on. They do not enjoy it.'],
          generic: ['<b><yellow>A savage bite</yellow></b> — {target} throws themselves back to break your grip and takes the wound with them.'],
        },
        severe: {
          bare:    ['<b><red>You bite down on {target}\'s throat and don\'t let go until they make you.</red></b>'],
          generic: ['<b><red>Your bite finds {target} where it matters most and leaves a wound they won\'t forget.</red></b>'],
        },
        devastating: {
          generic: ['<b><red>{target} goes down under the force of your bite and does not immediately rise.</red></b>'],
        },
      }, // end bite/attacker

      claw: {
        graze: {
          plate:   ['Your claws rake across {target}\'s armor. The metal wins that exchange.'],
          leather: ['Your claws drag across {target}\'s leather, raising four thin lines.'],
          bare:    ['A raking swipe across {target}\'s cheek. Surface marks, nothing more.'],
          scales:  ['Your claws scrape uselessly across {target}\'s scales.'],
          ethereal:['Your claws sweep through {target}\'s form. They shiver from the contact.'],
          generic: ['Your attack rakes across {target} without finding much to hold onto.'],
        },
        light: {
          plate:   ['Your claws find the gap at {target}\'s collar. A shallow rake, but it landed.'],
          leather: ['You drag your claws across {target}\'s leather armor. A few lines break through.'],
          bare:    ['Your claws catch {target}\'s forearm — three shallow lines that sting immediately.'],
          scales:  ['You find the soft seam between two of {target}\'s scales and rake briefly.'],
          ethereal:['Your claws pull through the edge of {target}\'s form. The disruption is light but real.'],
          generic: ['Your claws find {target} and leave a mark. Small, but you drew something.'],
        },
        moderate: {
          plate:   ['Your claws <yellow>find the gap at {target}\'s knee</yellow> and tear through the padding inside.'],
          leather: ['You <yellow>rip open {target}\'s leather shoulder</yellow> and the flesh beneath in one stroke.'],
          bare:    ['Four parallel lines open across {target}\'s chest. <yellow>Deep enough to bleed freely</yellow>.'],
          scales:  ['You <yellow>lever a scale free</yellow> from {target}\'s flank and gouge the skin underneath.'],
          ethereal:['Your claws <yellow>drag through {target}\'s form</yellow> and the disruption takes a moment to smooth over.'],
          generic: ['Your attack <yellow>opens {target}</yellow> across the exposed side.'],
        },
        heavy: {
          bare:    ['<b><yellow>You rake {target} from shoulder to hip</yellow></b>. The wounds are numerous and honest.'],
          generic: ['<b><yellow>A savage raking strike</yellow></b> — {target} takes the full spread of your attack and staggers back.'],
        },
        severe: {
          bare:    ['<b><red>Your claws tear {target} open in four parallel lines that run deep.</red></b>'],
          generic: ['<b><red>You claw through {target}\'s defenses entirely</red></b> and the damage is considerable.'],
        },
        devastating: {
          generic: ['<b><red>The full weight of your attack tears {target} apart in a way that isn\'t a question anymore.</red></b>'],
        },
      }, // end claw/attacker

      arcane: {
        graze: {
          plate:    ['Your spell crackles across {target}\'s armor and discharges harmlessly.'],
          ethereal: ['The arcane energy interacts with {target}\'s form, creating interference without clear damage.'],
          generic:  ['Your spell glances off {target}, more flash than force.'],
        },
        light: {
          plate:    ['Arcane force blooms against {target}\'s armor. The energy transfers inward.'],
          bare:     ['Your spell catches {target} and leaves a bright mark at the point of contact.'],
          ethereal: ['Your arcane strike disrupts the structure of {target}\'s form. They waver.'],
          generic:  ['Your spell connects with {target}. The energy takes hold.'],
        },
        moderate: {
          plate:    ['Arcane energy <yellow>seeps through {target}\'s armor</yellow>, bypassing the metal entirely.'],
          bare:     ['Your spell <yellow>hits {target} square</yellow> and the energy discharges through them.'],
          ethereal: ['Your arcane strike <yellow>tears through {target}\'s composition</yellow> — the magic was made for this.'],
          generic:  ['The spell finds {target} and <yellow>detonates on contact</yellow>. The effect is visible.'],
        },
        heavy: {
          plate:    ['Arcane force <b><yellow>punches through {target}\'s armor</yellow></b> as though it weren\'t there.'],
          bare:     ['<b><yellow>Your spell blasts {target} off their footing</yellow></b> and the energy lingers where it struck.'],
          ethereal: ['<b><yellow>The arcane blast tears a section of {target} away</yellow></b>. They struggle to reassemble.'],
          generic:  ['<b><yellow>A direct hit</yellow></b> — your magic finds {target} and the discharge is significant.'],
        },
        severe: {
          ethereal: ['<b><red>{target}\'s form collapses inward</red></b> where your arcane energy detonates inside it.'],
          generic:  ['<b><red>Your spell hits {target} with full force and the damage is obvious and extensive.</red></b>'],
        },
        devastating: {
          generic:  ['<b><red>The arcane force tears through {target} completely, leaving no doubt about who won this exchange.</red></b>'],
        },
      }, // end arcane/attacker

      elemental: {
        graze: {
          plate:    ['Your element scars {target}\'s armor but the surface holds.'],
          bare:     ['A graze of elemental force across {target}\'s skin. A smell and a sting.'],
          generic:  ['Your elemental attack catches the edge of {target}. A taste of what it could have been.'],
        },
        light: {
          plate:    ['Your element bleeds through {target}\'s armor at the joints. Not much, but inside now.'],
          bare:     ['{target} catches a real measure of your element. They recoil from the contact.'],
          ethereal: ['Your elemental force finds {target}\'s nature and disagrees with it. They feel it.'],
          generic:  ['Your elemental strike lands on {target}. Light, but it left a mark.'],
        },
        moderate: {
          plate:    ['Elemental force <yellow>chars the joint of {target}\'s armor</yellow> and seeps inside.'],
          bare:     ['Your element <yellow>catches {target} full</yellow>. They recoil from the sensation, which is considerable.'],
          ethereal: ['The elemental force <yellow>interacts violently</yellow> with {target}\'s nature.'],
          generic:  ['Your elemental strike <yellow>lands clean</yellow> and {target} pays for it.'],
        },
        heavy: {
          plate:    ['<b><yellow>Elemental force batters through {target}\'s armor</yellow></b>. It finds the person inside regardless.'],
          bare:     ['<b><yellow>The element takes {target} entirely</yellow></b> and the damage is thorough.'],
          generic:  ['<b><yellow>A heavy elemental blow</yellow></b> that leaves {target} marked in every sense.'],
        },
        severe: {
          generic:  ['<b><red>Your element tears into {target} with real destructive force. They won\'t shake this off quickly.</red></b>'],
        },
        devastating: {
          generic:  ['<b><red>The elemental force you bring to bear on {target} is overwhelming. They have no answer for it.</red></b>'],
        },
      }, // end elemental/attacker

      // Fallback for unknown/inferred attack types
      generic: {
        graze: {
          generic: [
            'Your attack finds {target} but barely. A graze, no more.',
            'You strike {target} at the edge of your range. More glance than blow.',
          ],
        },
        light: {
          generic: [
            'You land a light blow on {target}. It connects but doesn\'t punish.',
            'Your attack finds {target}. Small, but real.',
            'A glancing hit on {target} — you\'re in range now and they know it.',
            '{target} takes a light hit and absorbs it. You\'re finding your measure.',
            'You clip {target} without committing. It lands. They adjust.',
            'A quick hit that {target} doesn\'t fully avoid. Not much, but it adds up.',
          ],
        },
        moderate: {
          generic: [
            'A <yellow>solid hit</yellow> on {target}. You\'re landing properly now.',
            'Your attack <yellow>finds {target} cleanly</yellow>. That one had weight behind it.',
          ],
        },
        heavy: {
          generic: [
            '<b><yellow>A heavy blow lands on {target}</yellow></b>. They absorb it, but it costs them.',
            '<b><yellow>You hit {target} hard</yellow></b>. The impact travels through them.',
          ],
        },
        severe: {
          generic: [
            '<b><red>A severe blow against {target} that shakes their composure and their body equally.</red></b>',
            '<b><red>You strike {target} with the full weight of your attack. Something gives.</red></b>',
          ],
        },
        devastating: {
          generic: [
            '<b><red>Your attack hits {target} with devastating completeness. The fight\'s momentum has changed.</red></b>',
          ],
        },
      }, // end generic/attacker

    }, // end hit.attacker


    // POV: TARGET  (you are being hit)
    target: {

      bladed: {
        graze: {
          plate: [
            '{attacker}\'s blade skitters across your pauldron. You feel the vibration but nothing else.',
            'A slash that finds only the flat of your armor. Close — but close isn\'t a wound.',
          ],
          chain: [
            '{attacker}\'s blade drags across your mail. The rings hold. You let out a slow breath.',
          ],
          leather: [
            '{attacker}\'s sword draws a line across your shoulder. It stings through the leather.',
            'A quick cut from {attacker} catches your side. Your armor blunts the worst of it.',
          ],
          bare: [
            '{attacker}\'s blade nicks your forearm — a line of fire, there and gone.',
            'A glancing cut from {attacker}. You\'re bleeding slightly. Just slightly.',
          ],
          scales: [
            '{attacker}\'s blade skitters off your scales. You barely registered the attempt.',
          ],
          ethereal: [
            '{attacker}\'s blade passes through the edge of your form. You ripple from the contact.',
          ],
          generic: [
            '{attacker}\'s blade catches you but finds nothing to hold onto.',
            'A glancing strike from {attacker}. Neither of you is much changed.',
          ],
        },

        light: {
          plate: [
            '{attacker}\'s sword bites into the seam of your armor. Not deep, but you\'ll feel it.',
            'A clean draw across your chestplate — the metal holds, but the force carries through.',
          ],
          chain: [
            '{attacker} works their blade into your mail. A few links open. The wound underneath is shallow.',
          ],
          leather: [
            '{attacker}\'s blade opens a line through your leather armor. It finds the skin beneath.',
          ],
          bare: [
            '{attacker}\'s sword catches your forearm — not deep, but enough to feel.',
            'A quick cut from {attacker}. It opens and you register it completely.',
          ],
          scales: [
            '{attacker} finds a thin seam between your scales. You feel the edge go in, briefly.',
          ],
          ethereal: [
            '{attacker}\'s blade disrupts your form along one edge. You contract from it.',
          ],
          generic: [
            '{attacker}\'s strike connects with you. Light, but real.',
          ],
        },

        moderate: {
          plate: [
            '{attacker}\'s blade <yellow>wedges into the joint of your pauldron</yellow>. Your arm goes numb from the force.',
            'A solid hit against your chestplate. It held, but your <yellow>footing didn\'t</yellow>.',
          ],
          chain: [
            '{attacker} opens your mail at the shoulder. The wound underneath is <yellow>real and immediate</yellow>.',
          ],
          leather: [
            '{attacker}\'s sword <yellow>opens your leather armor</yellow> like it means it. You press your hand to the wound.',
          ],
          bare: [
            '{attacker}\'s blade <yellow>opens your forearm</yellow>. The pain is bright and immediate.',
            'A slash across your chest that you almost parry. Almost. You feel the sting <yellow>deepen into a burn</yellow>.',
          ],
          scales: [
            '{attacker} <yellow>finds the soft seam</yellow> between your scales. The flesh underneath makes up the difference.',
          ],
          ethereal: [
            '{attacker}\'s blade <yellow>catches your form clean</yellow>. You lose shape at the point of contact.',
          ],
          generic: [
            '{attacker} <yellow>finds you</yellow> with that strike. You absorb it but it registers.',
          ],
        },

        heavy: {
          plate: [
            '{attacker} drives their sword through the joint of your armor. Something gives. Your whole arm <b><yellow>goes cold</yellow></b>.',
            'The blow hammers through your defenses with enough force to <b><yellow>stagger you back</yellow></b>. Your vision swims.',
          ],
          chain: [
            '{attacker}\'s blade <b><yellow>shreds through your mail</yellow></b> and into the tissue beneath. You clamp down on the reaction.',
          ],
          leather: [
            '{attacker} opens you through your leather armor in a way the padding <b><yellow>wasn\'t designed to handle</yellow></b>.',
          ],
          bare: [
            '{attacker}\'s blade finds you clean and carves <b><yellow>deep into your side</yellow></b>. You stagger.',
            'A brutal cut that drops you to one knee. <b><yellow>The world tilts</yellow></b>. You force it back.',
          ],
          scales: [
            '{attacker} breaks through your natural armor. The wound <b><yellow>underneath is exposed and significant</yellow></b>.',
          ],
          ethereal: [
            '{attacker}\'s blade <b><yellow>tears through your form</yellow></b>. The light inside you gutters.',
          ],
          generic: [
            '{attacker} hits you <b><yellow>hard and true</yellow></b>. You absorb it, but only barely.',
          ],
        },

        severe: {
          plate: [
            '<b><red>{attacker}\'s sword punches through the joint of your armor. The pain arrives a moment later and doesn\'t apologize.</red></b>',
            '<b><red>The stroke is devastating.</red></b> Your armor shatters at the joint. You cry out. You don\'t mean to.',
          ],
          chain: [
            '<b><red>{attacker} tears through your mail</red></b> in a way that makes your other wounds feel small.',
          ],
          leather: [
            '<b><red>{attacker}\'s blade opens you from shoulder to hip.</red></b> The leather was a suggestion and they ignored it.',
          ],
          bare: [
            '<b><red>{attacker}\'s blade finds you clean.</red></b> There\'s warmth before there\'s pain, and then there\'s a great deal of pain.',
            '<b><red>You\'re cut open.</red></b> The world narrows to the wound and the effort it takes not to show it.',
          ],
          scales: [
            '<b><red>{attacker} drives through your natural armor</red></b> and what\'s underneath takes the full consequence.',
          ],
          ethereal: [
            '<b><red>{attacker}\'s blade tears through your form</red></b> and a piece of you scatters. You fight to reassemble.',
          ],
          generic: [
            '<b><red>{attacker} hits you with something you had no answer for.</red></b> The damage is significant.',
          ],
        },

        devastating: {
          plate:   ['<b><red>{attacker}\'s sword opens your armor like cloth. The world goes white and then comes back wrong.</red></b>'],
          chain:   ['<b><red>{attacker} shreds your mail in one stroke and the wound underneath takes your breath away entirely.</red></b>'],
          leather: ['<b><red>The leather was nothing. {attacker}\'s blade finds you completely and the fight changes its nature.</red></b>'],
          bare:    ['<b><red>{attacker}\'s sword opens you from flank to ribs and the world goes white. You are still standing only because you refuse to fall.</red></b>'],
          scales:  ['<b><red>{attacker} splits your natural armor down the center. The damage underneath is a reckoning.</red></b>'],
          ethereal:['<b><red>{attacker}\'s blade tears your form apart. Reconstituting is not a given.</red></b>'],
          generic: ['<b><red>{attacker} hits you with absolute finality. You have no answer. You may not need to give one much longer.</red></b>'],
        },
      }, // end bladed/target

      bludgeoning: {
        graze: {
          plate:   ['{attacker}\'s weapon glances off your helm. Your head rings briefly.'],
          chain:   ['A blow across your mail — distributed, absorbed. You feel it but don\'t pause.'],
          leather: ['{attacker}\'s strike thumps into your padded side. Not much came through.'],
          bare:    ['{attacker} clips your jaw. You roll with it. Barely.'],
          generic: ['{attacker}\'s blow grazes you. An annoyance, nothing more.'],
        },
        light: {
          plate:   ['{attacker} rings your helm. Your ears protest briefly.'],
          bare:    ['A jab catches your ribs. Nothing broken. You catalog it and move on.'],
          generic: ['{attacker} lands a blow. You feel the weight of it.'],
        },
        moderate: {
          plate:   ['{attacker} lands on your shoulder. The plate held but the bone underneath <yellow>took the concussion</yellow>.'],
          bare:    ['{attacker} catches you across the jaw. <yellow>Your vision stutters</yellow>.'],
          generic: ['{attacker} <yellow>hits you square</yellow>. The force travels all the way through.'],
        },
        heavy: {
          plate:   ['{attacker} brings their weapon down on your helm. The metal bends. <b><yellow>Your ears stop working properly</yellow></b>.'],
          bare:    ['{attacker}\'s blow lands flush against your jaw. Something <b><yellow>cracks</yellow></b>. You spin.'],
          generic: ['<b><yellow>A hammering blow from {attacker}</yellow></b> — your guard explodes open and you barely stay upright.'],
        },
        severe: {
          plate:   ['<b><red>{attacker} caves your pauldron inward.</red></b> The arm beneath stops cooperating.'],
          bare:    ['<b><red>{attacker} hits you with enough force to rattle things that weren\'t in the way.</red></b> You go down.'],
          generic: ['<b><red>{attacker}\'s blow is severe and honest and you absorb every bit of it.</red></b>'],
        },
        devastating: {
          generic: ['<b><red>{attacker} brings everything down on you at once. The world goes sideways and takes a moment to return.</red></b>'],
        },
      }, // end bludgeoning/target

      piercing: {
        graze: {
          plate:   ['{attacker}\'s thrust skates off your breastplate. The angle was wrong.'],
          bare:    ['{attacker}\'s point draws a line across your forearm. You watch the blood appear.'],
          generic: ['{attacker} thrusts at you and catches an edge. Noted.'],
        },
        light: {
          plate:   ['{attacker}\'s thrust finds a joint in your armor. The point goes in a little. Enough.'],
          chain:   ['{attacker} works the point through your mail. A narrow wound opens. You feel it immediately.'],
          bare:    ['{attacker}\'s thrust catches your side. A clean puncture — shallow, but already bleeding.'],
          scales:  ['{attacker} slips the point between two of your scales. Brief and real.'],
          generic: ['{attacker}\'s thrust connects. Narrow wound. You absorb it and adjust.'],
        },
        moderate: {
          plate:   ['{attacker} finds your armpit joint and works the point in. <yellow>Shallow, but it stings immediately</yellow>.'],
          bare:    ['A <yellow>clean puncture</yellow>. {attacker}\'s thrust goes in and you feel the full depth of it.'],
          generic: ['{attacker}\'s thrust <yellow>finds you cleanly</yellow>. A narrow wound but a real one.'],
        },
        heavy: {
          plate:   ['{attacker} drives the point through your gorget. The plate was there. <b><yellow>It didn\'t help</yellow></b>.'],
          bare:    ['<b><yellow>{attacker}\'s thrust hits center mass</yellow></b>. You fold slightly. You straighten on principle.'],
          generic: ['<b><yellow>{attacker} pushes into you</yellow></b> and the wound is deep before you can stop it.'],
        },
        severe: {
          generic: ['<b><red>{attacker} drives through you without hesitation and the wound is one you\'ll be managing for the rest of this fight.</red></b>'],
        },
        devastating: {
          generic: ['<b><red>{attacker}\'s weapon goes in to the hilt. The fight is asking you a serious question.</red></b>'],
        },
      }, // end piercing/target

      bite: {
        graze: {
          bare: [
            '{attacker} snaps at your arm. Teeth find skin but not much else.',
            '{attacker} lunges for your throat. You pull back. They get collar and air.',
            'A snap from {attacker} catches the edge of your forearm. A sting, nothing held.',
            '{attacker}\'s teeth graze your shoulder. You shake them off without much effort.',
            '{attacker} tries for your wrist. You move it. They get the outside of your hand.',
          ],
          generic: [
            '{attacker} lunges at you with teeth and finds only the edge of things.',
            '{attacker} snaps and misses the good part of you. The bad part stings briefly.',
            'A bite from {attacker} that lands without consequence. You note the attempt.',
            '{attacker} gets teeth on you. Not enough to hold, not enough to matter.',
            '{attacker} catches the very edge of you. Close. Not close enough.',
          ],
        },
        light: {
          bare: [
            '{attacker} bites into your forearm. You pull free. The mark stays.',
            'A quick bite from {attacker} finds your calf. Shallow but real.',
            '{attacker} gets your shoulder — enough to break skin, not enough to hold.',
            '{attacker}\'s teeth close on your wrist. You wrench it away. Something stings.',
            'You get free of {attacker}\'s bite but not before they leave a mark.',
          ],
          leather: ['{attacker} bites through your vambrace and finds the arm inside. Not deep. Noted.'],
          generic: [
            '{attacker}\'s bite finds you. Light, but you registered every tooth.',
            'You take a bite from {attacker} somewhere you didn\'t offer. It connects.',
            '{attacker} gets a real grip on you for a moment. You break it. The wound is already there.',
            'A bite that counts — {attacker} found skin and you both know it.',
            '{attacker} snaps at you and lands it. Small wound. Real wound.',
          ],
        },
        moderate: {
          leather: ['{attacker} bites through your vambrace and into the arm inside. <yellow>You wrench free and feel the effort</yellow>.'],
          bare:    ['{attacker}\'s bite <yellow>finds your shoulder</yellow> and clamps. You break the hold. The wound stays.'],
          generic: ['{attacker} bites you in a place that matters. <yellow>A real wound</yellow> and you know it.'],
        },
        heavy: {
          bare:    ['{attacker} bites down <b><yellow>deep into your calf</yellow></b>. You throw yourself back and take the wound with you.'],
          generic: ['<b><yellow>A savage bite</yellow></b> — you feel the full depth before you can pull free.'],
        },
        severe: {
          bare:    ['<b><red>{attacker}\'s jaws find your throat and you understand immediately how serious this is.</red></b>'],
          generic: ['<b><red>{attacker} bites you where it matters and you take a moment to process what that means for this fight.</red></b>'],
        },
        devastating: {
          generic: ['<b><red>{attacker} closes their jaws on you with complete commitment. You go down.</red></b>'],
        },
      }, // end bite/target

      claw: {
        graze: {
          plate:   ['{attacker}\'s claws rake your armor. It held.'],
          bare:    ['Claws rake across your cheek. Surface marks. You ignore them.'],
          generic: ['{attacker} swipes at you and catches the edge.'],
        },
        light: {
          plate:   ['{attacker}\'s claws find the gap at your collar and rake through.'],
          leather: ['{attacker} drags claws across your leather shoulder. A few lines break through to skin.'],
          bare:    ['Three shallow lines open across your forearm. {attacker}\'s claws found purchase, briefly.'],
          scales:  ['{attacker} catches the edge of a scale and peels it back. What\'s underneath stings.'],
          generic: ['{attacker}\'s claws find you. Light raking marks. Enough to count.'],
        },
        moderate: {
          leather: ['{attacker} <yellow>tears open your leather shoulder</yellow>. The flesh beneath was not spared.'],
          bare:    ['Four parallel lines open across your chest. <yellow>They bleed with real commitment</yellow>.'],
          generic: ['{attacker}\'s claws find you <yellow>on the exposed side</yellow>. You feel every one.'],
        },
        heavy: {
          bare:    ['{attacker} rakes you <b><yellow>from shoulder to hip</yellow></b>. The wounds are numerous.'],
          generic: ['<b><yellow>A full raking strike from {attacker}</yellow></b> — you take the spread of it across your guard.'],
        },
        severe: {
          bare:    ['<b><red>{attacker} tears you open in four lines that run deep and parallel.</red></b>'],
          generic: ['<b><red>{attacker} claws through your defenses entirely. The damage is considerable and immediate.</red></b>'],
        },
        devastating: {
          generic: ['<b><red>{attacker} tears you apart with complete thoroughness. There is no good answer to what just happened.</red></b>'],
        },
      }, // end claw/target

      arcane: {
        graze: {
          generic: ['{attacker}\'s spell catches your edge. More flash than consequence.'],
          plate:   ['Arcane energy crackles across your armor and discharges before it can hurt you.'],
        },
        light: {
          plate:    ['Arcane energy bleeds through your armor at the seams. It found the person inside.'],
          bare:     ['{attacker}\'s spell catches you and leaves a bright ache where it landed.'],
          ethereal: ['The arcane energy disrupts the edge of your form. You feel it reordering something.'],
          generic:  ['{attacker}\'s spell finds you. The energy settles into the wound and hums.'],
        },
        moderate: {
          plate:   ['Arcane force <yellow>seeps through your armor entirely</yellow>. The metal didn\'t matter.'],
          bare:    ['{attacker}\'s spell <yellow>hits you direct</yellow> and the discharge moves through you before you can brace.'],
          ethereal:['The arcane energy <yellow>tears through your composition</yellow>. It was made for exactly this.'],
          generic: ['{attacker}\'s magic <yellow>finds you</yellow> and detonates. The effect is immediate.'],
        },
        heavy: {
          plate:   ['Arcane force <b><yellow>punches through your armor</yellow></b>. The metal was not a factor.'],
          generic: ['<b><yellow>{attacker}\'s spell blasts you off your footing</yellow></b>. The energy lingers where it struck.'],
        },
        severe: {
          generic: ['<b><red>{attacker}\'s magic hits you with full force.</red></b> You stagger and take stock of the damage.'],
        },
        devastating: {
          generic: ['<b><red>{attacker}\'s arcane force tears through you completely. This is a serious problem.</red></b>'],
        },
      }, // end arcane/target

      elemental: {
        graze: {
          generic: ['{attacker}\'s element catches you. A sting and a smell.'],
        },
        light: {
          plate:    ['{attacker}\'s element seeps through the joints of your armor. It finds the skin inside, briefly.'],
          bare:     ['{attacker}\'s element catches you. The sensation is immediate and unpleasant.'],
          ethereal: ['The elemental force interacts with your nature. You feel it in a place that has no name.'],
          generic:  ['{attacker}\'s element lands on you. Light, but it left something behind.'],
        },
        moderate: {
          plate:   ['Elemental force <yellow>chars through your armor\'s joint</yellow> and finds the skin inside.'],
          bare:    ['{attacker}\'s element <yellow>catches you full</yellow>. The sensation is not subtle.'],
          generic: ['{attacker}\'s elemental strike <yellow>lands on you</yellow> and you pay for it.'],
        },
        heavy: {
          plate:   ['<b><yellow>Elemental force batters through your armor</yellow></b>. It found the person inside regardless.'],
          bare:    ['<b><yellow>The element takes you entirely</yellow></b>. The damage is thorough.'],
          generic: ['<b><yellow>{attacker}\'s element hits you hard</yellow></b> and marks you in every sense.'],
        },
        severe: {
          generic: ['<b><red>{attacker}\'s element tears into you with real destructive force. You won\'t shake this off quickly.</red></b>'],
        },
        devastating: {
          generic: ['<b><red>The elemental force {attacker} brings to bear is overwhelming. You have no answer for it.</red></b>'],
        },
      }, // end elemental/target

      generic: {
        graze: {
          generic: [
            '{attacker}\'s attack finds you but doesn\'t hold. A graze.',
            'You take a hit from {attacker} at the very edge of it. Barely.',
          ],
        },
        light: {
          generic: [
            '{attacker} connects with a light blow. You note it and adjust.',
            'A hit from {attacker} that lands cleanly enough. Small, but real.',
            '{attacker} finds you with a light strike. You absorb it and keep moving.',
            'A glancing hit from {attacker} — not enough to slow you, enough to count.',
            '{attacker} clips you. Nothing serious. It\'s still a hit.',
            'You take a light one from {attacker}. Catalogued and set aside.',
          ],
        },
        moderate: {
          generic: [
            '{attacker} <yellow>finds you properly</yellow>. That one registered.',
            'A <yellow>real hit</yellow> from {attacker} that carries weight. You absorb it.',
          ],
        },
        heavy: {
          generic: [
            '<b><yellow>{attacker} hits you hard.</yellow></b> You absorb it. It costs something.',
            'A <b><yellow>heavy blow from {attacker}</yellow></b> — your guard opens and you spend a moment finding it again.',
          ],
        },
        severe: {
          generic: [
            '<b><red>{attacker} strikes you severely.</red></b> The damage is not abstract.',
            '<b><red>A severe blow from {attacker} that shakes both your composure and your body.</red></b>',
          ],
        },
        devastating: {
          generic: [
            '<b><red>{attacker}\'s attack hits you with devastating completeness. The fight\'s momentum has changed.</red></b>',
          ],
        },
      }, // end generic/target

    }, // end hit.target

  }, // end hit


  // AVOIDANCE TEMPLATES
  // Structure: avoid[pov][avoidType][ease] = string[]
  // pov: 'attacker' (your attack was avoided) | 'target' (you avoided their attack)
  // avoidType: 'miss' | 'dodge' | 'block' | 'parry' | 'partial'
  // ease: 'effortless' | 'narrow' | 'desperate'

  avoid: {

    attacker: { // your attack was avoided by {target}
      miss: {
        effortless: [
          '{target} sidesteps your swing as though they\'d seen it coming for hours.',
          'Your attack finds empty air. {target} doesn\'t even look winded.',
          '{target} steps around your strike without breaking stride.',
        ],
        narrow: [
          '{target} pulls back just shy of your blade. A hair\'s breadth — and they know it.',
          'Your weapon grazes past {target}\'s ear. They exhale sharply. So did you.',
          '{target} turns their head and your strike passes clean. Just.',
        ],
        desperate: [
          '{target} stumbles out of the path of your attack. Luck, not skill — but they\'re still standing.',
          'A clumsy backward lurch from {target} saves them. They nearly went down avoiding you.',
          '{target} throws themselves clear of your attack. Graceless. Effective.',
        ],
      },
      dodge: {
        effortless: [
          '{target} reads your movement and is simply elsewhere when the strike arrives.',
          'Your attack lands where {target} was. They were there until they weren\'t.',
        ],
        narrow: [
          '{target} twists away from your blow at the last instant. Close.',
          'A narrow escape for {target} — your strike passes close enough to disturb their hair.',
        ],
        desperate: [
          '{target} flings themselves aside from your attack. It works. Barely.',
          'A sprawling scramble from {target} keeps them alive through this exchange.',
        ],
      },
      block: {
        firm: [
          '{target}\'s shield meets your strike and stops it dead. They didn\'t even shift their feet.',
          'You hit exactly where {target} wanted you to — against their guard, going nowhere.',
          '{target} catches your blow square on their guard. Clean stop. No give.',
        ],
        staggered: [
          '{target} gets their guard up in time but staggers under your blow. They held — barely.',
          'The impact rocks {target} back. They maintained the block, but it cost them something.',
          '{target}\'s block absorbs the strike, but you can see the effort it took.',
        ],
      },
      parry: {
        clean: [
          '{target} redirects your strike cleanly. The blade goes wide without touching them.',
          'A precise parry from {target} — your weapon is pushed aside before it could do harm.',
        ],
        barely: [
          '{target} catches your weapon at the last moment. Their parry was rough but it worked.',
          'A ragged deflection from {target}. Your strike went wide. That\'s what matters.',
        ],
      },
      partial: [
        '{target} turns most of your blow aside. Most of it.',
        'A partial block — {target} caught the strike but not cleanly. They took something from it.',
        '{target} mitigated the worst of your attack. Some of it found them regardless.',
      ],
    }, // end avoid.attacker

    target: { // you avoided {attacker}'s attack
      miss: {
        effortless: [
          '{attacker}\'s strike passes wide. You were never in danger.',
          'You read the attack before it launched. A small step and it found nothing.',
          '{attacker} swings and you aren\'t there. It was easy.',
        ],
        narrow: [
          '{attacker}\'s blade clips the air where your neck was a breath ago.',
          'You pull back just enough. The wind of it brushes your cheek.',
          'A narrow miss from {attacker}. You file it away. They\'re getting closer.',
        ],
        desperate: [
          'You throw yourself aside from {attacker}\'s strike. Graceless, but effective.',
          'A sprawling scramble backward. {attacker}\'s weapon buries itself in the dirt where you stood.',
          'You get clear of {attacker}\'s attack. You\'re not proud of how.',
        ],
      },
      dodge: {
        effortless: [
          'You slip around {attacker}\'s blow before it fully forms.',
          '{attacker}\'s attack arrives where you were. You haven\'t been there for a moment.',
        ],
        narrow: [
          'You twist away from {attacker}\'s strike at the last instant.',
          '{attacker} nearly has you. Nearly.',
        ],
        desperate: [
          'You fling yourself clear of {attacker}\'s attack and land without dignity.',
          'A desperate roll takes you out of {attacker}\'s range. You stand back up before they can press.',
        ],
      },
      block: {
        firm: [
          '{attacker}\'s strike meets your shield and stops dead. You didn\'t even shift your feet.',
          'You catch the blow square on your guard. Clean stop.',
          '{attacker} hits your shield and learns nothing from it. It went nowhere.',
        ],
        staggered: [
          'You get your shield up in time but the force shoves you back a step.',
          'The impact rattles up your arm to your teeth. You held — barely.',
          '{attacker}\'s blow staggers you through the block. You hold the line.',
        ],
      },
      parry: {
        clean: [
          'You redirect {attacker}\'s strike cleanly. It passes wide.',
          'A precise parry — {attacker}\'s weapon is elsewhere before they realize what happened.',
        ],
        barely: [
          'You catch {attacker}\'s strike at the last possible moment. The parry was ugly. It held.',
          'A rough deflection against {attacker}\'s blow — not clean, but the blade went wide.',
        ],
      },
      partial: [
        'You turn most of {attacker}\'s blow aside. Most of it.',
        'A partial block — you caught the strike but not cleanly. Some of it found you regardless.',
        'You mitigated the worst of {attacker}\'s attack. The rest is yours to carry.',
      ],
    }, // end avoid.target

  }, // end avoid


  // ARC LANGUAGE
  // Structure: arc[stage] = string[]
  // Emitted on stage transitions. {attacker} and {target} available.

  arc: {
    opening: [
      'The distance between you collapses. It begins.',
      '{attacker} moves first. You answer.',
      'Neither of you has made a mistake yet. That\'s about to change.',
      'The first exchange. Both of you are still whole.',
      'You read each other across the space between you. Then that space closes.',
    ],

    exchange: [
      'The fight finds its rhythm — brutal, honest, and ongoing.',
      'You\'re trading. Neither of you is winning. Both of you are losing.',
      'This is becoming a war of attrition. You wonder which of you has more to spend.',
      'Back and forth. The damage accumulates without a clear decision.',
      'The fight settles into something neither of you is winning quickly.',
    ],

    'turning:winning': [
      'The momentum has shifted. {attacker} feels it too — their eyes give it away.',
      'You\'re ahead now. The question is how you finish it.',
      '{attacker} is fighting to survive. You\'re fighting to end it.',
      'The fight\'s shape has changed. You\'re the one shaping it.',
      'Something tipped and didn\'t come back. {attacker} knows.',
    ],

    'turning:losing': [
      'Something changed and you\'re not sure when. {attacker} has the edge now.',
      'You\'re behind. You can feel the shape of this fight changing under your feet.',
      'Desperation has a smell. You recognize it. It\'s yours.',
      'The initiative is gone. {attacker} has it. You have to take it back.',
      '{attacker} is ahead. How far behind are you? That\'s the question you\'re managing now.',
    ],

    desperate: [
      'There\'s no strategy left. Just survival and whatever you can pull from somewhere beyond your body.',
      'You\'ve stopped counting the hits. You\'ve started counting breaths instead.',
      'This fight is no longer about winning. It\'s about whether it ends.',
      'Everything is borrowed now — time, strength, composure.',
    ],

    closing: [
      '{attacker} is almost done. One more exchange settles this.',
      '{attacker} is running out of fight. You are not.',
      'The end of this is written on {attacker}. They just haven\'t read it yet.',
      '{attacker} has almost nothing left. You can see it.',
    ],
  }, // end arc


  // EXHAUSTION STATE FLAVOR
  // Structure: exhaustion[pov][tier] = string[]
  // pov: 'self' (your state) | 'target' (their visible state)
  // tier: 1 (fresh) through 6 (death's door)
  // Emitted periodically during combat, throttled by shouldEmitFlavor()

  exhaustion: {
    self: {
      1: [], // fresh — no narration, silence reads as well
      2: [
        'You\'re starting to feel the exchanges in your chest. Nothing serious. Not yet.',
        'The fight is leaving its marks. You catalog them and push forward.',
        'Winded. You\'ve been winded before. You keep moving.',
      ],
      3: [
        'Your body is filing complaints you don\'t have time to acknowledge.',
        'You\'re hurt. Not finished — but hurt.',
        'The damage is adding up. You don\'t look at it. You keep fighting.',
        'Something is leaking. You decide not to investigate.',
      ],
      4: [
        'The blood on you is mostly your own now. You know this. You\'re choosing not to dwell on it.',
        'Every movement costs something extra. You\'re paying in installments you can\'t afford.',
        'You\'re not sure when it became this much. You\'re sure it\'s going to get worse.',
        'Your arms are heavier than they were. Your guard is slower than you want it to be.',
      ],
      5: [
        'You are losing this. Some part of you has accepted that. The rest of you refuses.',
        'Your arms are heavy. Your vision keeps losing focus. You don\'t stop.',
        'Running on reflex alone now. The body makes decisions you haven\'t approved yet.',
        'Each breath costs more than the last. You take them anyway.',
      ],
      6: [
        'You are held upright by something that has nothing to do with your body.',
        'One more hit like that and the question answers itself.',
        'You have no reserves left. What you have is the decision not to fall.',
        'The world is narrowing. You are the last thing in it.',
      ],
    },

    target: {
      1: [], // fresh — no narration
      2: [
        '{target} is starting to breathe through the exchanges. The first mark is showing.',
        'A tightness is creeping into {target}\'s movement. They\'re feeling it.',
        '{target}\'s guard returns a fraction slower after each exchange.',
      ],
      3: [
        '{target} is favoring something now. The fight has gotten into them.',
        'The damage is adding up on {target}. Their guard is slower to recover.',
        '{target} is hurt and working to hide it. Not entirely succeeding.',
      ],
      4: [
        '{target} is visibly hurting. Every movement is costing more than it should.',
        'Blood and effort. {target} is still in this, but only through will.',
        '{target}\'s form is breaking down. Each exchange extracts a higher price.',
        'The wear on {target} is obvious now. They\'re fighting behind on everything.',
      ],
      5: [
        '{target} is running on reflex alone. The body is making decisions without them.',
        'Each step from {target} is heavier than the last. The end of this is written on them.',
        '{target} is fighting the way drowning people fight — wild, costly, past all economy.',
        'Something primal has taken over in {target}. They\'re dangerous the way cornered things are dangerous.',
      ],
      6: [
        '{target} is barely upright. Something is keeping them on their feet that isn\'t strength.',
        'You can see it in {target}\'s eyes — they know it too.',
        '{target} is past the point of strategy. They\'re past the point of most things.',
        'One more exchange and the question answers itself. {target} knows the math.',
      ],
    },
  }, // end exhaustion

  // CLARITY STATE FLAVOR
  // Structure: clarity[tier] = string[]
  // tier: 1 (sharp) through 5 (delirious)
  // These reflect your mental/resource state. Throttled same as exhaustion.

  clarity: {
    1: [], // sharp — no narration
    2: [
      'Concentration is starting to cost you something. You\'re still in control.',
      'The edges of your focus are requiring maintenance. Manageable.',
    ],
    3: [
      'The edges of your focus are softening. You\'re reacting more than thinking.',
      'You\'re ahead of the fight by less than you were. You notice this.',
      'Your reads are a half-beat slower. Not enough to betray you. Yet.',
    ],
    4: [
      'The world is coming at you faster than you can process it. You\'re running on instinct.',
      'Your mind is getting behind your body. Your body is improvising.',
      'Dazed. The sequence of events is unclear. You keep moving and trust the feet know the floor.',
    ],
    5: [
      'You\'re not sure anymore which pain is old and which is new. You swing and trust something will connect.',
      'Delirious. The fight is happening in pieces and you\'re assembling them out of order.',
      'Your focus is gone. What\'s left is motion and the sound of it and the fact of it.',
    ],
  }, // end clarity


  // HEAL TEMPLATES
  // Structure: heal[pov][magnitude][arcStage] = string[]
  // pov: 'self' (you were healed) | 'other' (you healed someone / saw them healed)
  // magnitude: 'minor' | 'moderate' | 'major'
  // arcStage: mirrors arc stages, 'generic' used when no specific match

  heal: {

    self: {
      minor: {
        generic: [
          'Something knits. A warmth moves through the worst of it — not enough to change the math, but enough to keep playing.',
          'A small reprieve. Not a reversal. But you\'ll take it.',
          'The bleeding slows at one of the wounds. You note it with grim gratitude.',
        ],
        desperate: [
          'Even this much is something. You weren\'t sure there\'d be anything left to work with.',
          'A flicker of restoration in a bad moment. You use it.',
        ],
        'turning:losing': [
          'Not enough to close the gap. But the gap is a little smaller than it was.',
        ],
      },

      moderate: {
        generic: [
          'The tide shifts under your feet. What felt like a losing position has air in it again.',
          'Color returns to the edges of your vision. {target} watches you recover and adjusts.',
          'A real measure of restoration. You stand up straighter than you did before.',
          'The worst of it pulls back. You still have a fight in front of you, but you have more with which to fight it.',
        ],
        desperate: [
          'You were running out. Now you\'re not. That changes things.',
          'The restoration arrives at exactly the right moment and you don\'t waste it.',
          'Something comes back that you\'d already written off. {target}\'s expression shifts.',
        ],
        'turning:losing': [
          'The gap you\'d been managing closes a little. {target} notices. You notice them noticing.',
          'A foothold. Not a reversal — but a foothold.',
        ],
        exchange: [
          'The exchange resets in your favor for a moment. You use the moment.',
        ],
      },

      major: {
        generic: [
          'The full measure of it rushes through you and you come back from somewhere you\'d been heading.',
          'You were almost done. Now you aren\'t. This changes the shape of everything.',
        ],
        desperate: [
          'You were almost done. Now you aren\'t. {target}\'s expression shifts — whatever plan they had accounted for a different version of this fight.',
          'The light pours back into you. {target} actually takes a step back. This isn\'t over. Not even close.',
          'A complete reversal of the worst moment. You straighten. You breathe. You are here.',
        ],
        'turning:losing': [
          'The advantage {target} had built begins to dissolve. They see it happen and there\'s nothing to do about it.',
          'You pull back from the edge entirely. {target} had you. They don\'t anymore.',
        ],
        exchange: [
          'The fight resets at a stroke. You are more yourself than you were ten seconds ago.',
        ],
      },
    }, // end heal.self

    other: { // you observe someone else being healed, or you healed {target}
      minor: {
        generic: [
          '{target} steadies. Something about them reconstitutes. The damage you\'ve done narrows slightly.',
          'A small restoration in {target}. The opening you\'d been working narrows.',
        ],
        desperate: [
          '{target} receives something in a bad moment. Not much. But they use it.',
        ],
      },
      moderate: {
        generic: [
          'The advantage you\'d built begins to close. {target} straightens. Their eyes clear.',
          'You feel the fight reset. {target} has bought themselves back into this.',
          '{target} is more recovered than they have any right to be. You start the accounting over.',
        ],
        desperate: [
          '{target} recovers from the edge of it. The fight has a new shape now.',
          'Whatever gap you\'d opened is closing. {target} is back in this.',
        ],
      },
      major: {
        generic: [
          '{target} is restored in a way that makes your work feel undone. You start the accounting over.',
          'Whatever gap you\'d opened is gone. {target} meets your eyes and the fight begins a second time.',
        ],
        desperate: [
          '{target} comes all the way back. The fight you thought you were finishing was only half of it.',
          'A full restoration. {target} is here again in full. You adjust everything.',
        ],
      },
    }, // end heal.other

  }, // end heal

  // KILL TEMPLATES
  // Structure: kill[pov] = string[]
  // pov: 'killer' (you killed {target}) | 'killed' (you were killed by {attacker})

  kill: {
    killer: [
      '{target} falls and doesn\'t rise. The fight empties out of the air around you.',
      'The last thing {target} does is fall. You let yourself breathe.',
      'It ends. The silence after is its own kind of relief.',
      '{target} goes down and stays down. You stand in the quiet of it.',
      '{target} collapses. The fight is over. You are still here.',
    ],
    killed: [
      'The ground comes up. You didn\'t expect the ground.',
      '{attacker} lands the one you couldn\'t answer. The world goes dark and quiet.',
      'You go down. The last thing you see is {attacker} above you, and then nothing.',
      'Everything stops. That\'s all.',
    ],
  }, // end kill

}; // end T

module.exports = T;
