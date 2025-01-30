const createTranscriptiono = async (request, response, next) => {
    try {
        const loggedUserId = request.session.user.id;
        // Handle file to upload
        const { filePath, filename, fileRecordedAt, formattedDate } =
            processUploadedFile(request.file);
        logger.info(
            `Incoming request from user_id ${loggedUserId} to ${request.method} ${request.originalUrl}`
        );

        // Upload the audio file to AssemblyAI
        const uploadResponse = await assemblyClientUpload(filePath);
        const uploadUrl = uploadResponse.upload_url;
        if (!uploadResponse || !uploadResponse.upload_url) {
            logger.error(
                `[transcriptionsMiddleware - createTranscription] => Error uploading file to AssemblyAI ${error.message}`
            );
            response.status(500).json({
                success: false,
                message: "Error uploading file to AssemblyAI",
            });
            throw new Error("Error uploading file to AssemblyAI");
        }
        logger.info(
            `[transcriptionsMiddleware - createTranscription] => Upload file to AssemblyAI successfull, response object: ${JSON.stringify(
                uploadResponse
            )}`
        );

        // Request a transcription using the transcribeAudio function
        const transcriptResponse = await transcribeAudio(uploadUrl);
        const transcriptId = transcriptResponse.id;
        if (!transcriptResponse || !transcriptResponse.id) {
            logger.error(
                `[transcriptionsMiddleware - createTranscription] => Error transcribing audio file: ${error.message}`
            );
            response.status(500).json({
                success: false,
                message: "Error transcribing audio file",
            });
            throw new Error("Error transcribing audio file");
        }

        // Poll AssemblyAI for the transcription result
        let transcript;
        while (true) {
            transcript = await assemblyClient.transcripts.get(transcriptId);
            if (transcript.status === "completed") {
                logger.info(
                    `[transcriptionsMiddleware - createTranscription] => Transcription completed: ${JSON.stringify(
                        transcript
                    )}`
                ); // change to transcriptId to avoid circular reference
                break;
            } else if (transcript.status === "failed") {
                logger.error(
                    `[transcriptionsMiddleware - createTranscription] => Transcription failed: ${JSON.stringify(
                        transcriptId
                    )}`
                );
                throw new Error("Transcription failed");
            }
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before polling again
        }

        const transcriptData = {
            user_id: loggedUserId,
            filename: filename,
            fileRecordedAt: fileRecordedAt,
            transcriptId: transcriptId,
            transcriptObject: transcript,
        };

        // Store transcription and metadata to the database
        const insertedTranscription = await storeTranscriptionText({
            transcriptData,
        });

        // Define the path for the transcription text file
        const transcriptionFilename = `${
            path.parse(filename).name
        }_${formattedDate}.txt`;
        const transcriptionFilePath = path.join(
            __dirname,
            "../transcriptions",
            transcriptionFilename
        );

        // Ensure the transcriptions directory exists
        if (!fs.existsSync(path.dirname(transcriptionFilePath))) {
            fs.mkdirSync(path.dirname(transcriptionFilePath), {
                recursive: true,
            });
        }

        // Write the transcription to a text file
        fs.writeFileSync(transcriptionFilePath, transcriptionText);

        // Respond with the transcription and file details
        response.status(200).json({
            success: true,
            message: "Transcription created and stored successfully",
            data: insertedTranscription,
        });
    } catch (error) {
        logger.error(
            `[transcriptionsMiddleware - createTranscription] => Error: ${error.message}`
        );
        next(error);
    }
};

/***************************************************************************** */

const createTranscription = async (request, response, next) => {
    try {
        const loggedUserId = request.session.user.id;
        const { filePath, filename, fileRecordedAt, formattedDate } =
            processUploadedFile(request.file);

        logger.info(
            `Incoming request from user_id ${loggedUserId} to ${request.method} ${request.originalUrl}`
        );

        // Upload the audio file
        const uploadUrl = await uploadAudioFile(filePath);

        // Request a transcription
        const transcriptId = await requestTranscription(uploadUrl);

        // Poll for transcription result
        const transcript = await pollTranscriptionResult(
            transcriptId,
            assemblyClient
        );

        // Store transcription in the database
        const transcriptData = {
            user_id: loggedUserId,
            filename,
            fileRecordedAt,
            transcriptId,
            transcriptObject: transcript,
        };
        const insertedTranscription = await storeTranscriptionText({
            transcriptData,
        });

        // Save the transcription to a file
        saveTranscriptionToFile(filename, formattedDate, transcript.text);

        // Send response
        response.status(200).json({
            success: true,
            message: "Transcription created and stored successfully",
            data: insertedTranscription,
        });
    } catch (error) {
        logger.error(`[createTranscription] => Error: ${error.message}`);
        next(error);
    }
};
