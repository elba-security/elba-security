# Overview

In this section, we will walkthrough our syncing workflow to make sure you can implement it as smoothly as possible.

It is important to note that this workflow can be (and should be) replicated for both users syncing workflow as well as your respective app needed resources (third-party apps, data protection or authentication for example).

All of this workflow is powered by Inngest, our event-based task scheduler, in order to better handle our asynchronous workflows.

## Prerequisites

You need to have implemented authentication workflow as well as set up your database.

## Sync scheduling workflow

First of all, we need to schedule sync task for each organization that gave organization to your integration. The only goal is to go through every organization stored in your database and send an event through Inngest for each of these.

Read more about it on `sync-scheduling-workflow.md`

## Sync starting workflow

Once you're done with scheduling, you can then proceed to start a syncing process for each of those events you sent previously.

Read more about it on `sync-starting-workflow.md`

## Sync processing workflow

Lastly, once you started syncing process, you can finally execute your own logic that will retrieve dedicated resources on the source you're working on.

Read more about it on `sync-processing-workflow.md`
