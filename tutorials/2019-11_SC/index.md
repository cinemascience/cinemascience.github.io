# Cinema Tutorial Instructions - 2019 SC

This Cinema tutorial will go through two workflows: exporting a Cinema database from ParaView and running a command line analysis workflow.


You will need to have these installed/set up before running the tutorial:

- ParaView 5.7.1
- Install cinema_lib: [cinema_lib Github instructions](https://github.com/cinemascience/cinema_lib)
- A browser set up with appropriate permissions:
    - Safari
        - Safari->Preferences->Advanced->Show Develop menu in menu bar
        - Safari->Develop->Disable Local File Restrictions (on)
        - **NOTE:** Reset file restrictions when you are done
    - Firefox
        - In address bar, input **about:config:**
		    - Change **privacy.file_unique_origin** to **false**
        - **NOTE:** Reset file restrictions when you are done
    - Chrome (exit Chrome)
        - use --disable-web-security command line option for this session
        - example for Mac: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/var/tmp/Chrome dev session" --disable-web-security tutorial.html >> /dev/null 2>&1


## Export a Cinema database from ParaView 5.7.1

- [Application Export Example (ParaView)](scripts_offline/make_nyx_cinema_database.html)

## Run a cinema_lib workflow to find contours

- [Cinema Command Line Algorithm Example](scripts_offline/run_cinema_lib_workflow.html)
